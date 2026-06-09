/**
 * =================================================================
 * 信息 (Information)
 * =================================================================
 * IndexDB: 基于 IndexedDB 的声明式/多物理表轻量级存储库.
 * 完美融合了 Dexie 的丝滑 API 与轻量级单文件设计的优势.
 *
 * 特性:
 * 1. 属性代理: 引入 Proxy 机制, 允许像访问对象属性一样直接操作表 (db.tableName.put).
 * 2. 真实物理隔离: 支持在初始化时自定义真正的物理表与索引, 释放 IndexedDB 原生查询性能.
 * 3. 灵活主键: 支持任意自定义主键字段, 并原生支持 `$$` 前缀的自动增量主键 (Auto-Increment).
 * 4. 批量事务: 内置高效的原子级批量写入 `bulkPut` 与全量获取 `toArray`.
 * 5. 健壮容错: 内部自动捕获异常并输出日志, 提供安全的默认返回值 (吞掉崩溃, 保障 UI).
 *
 * 作者: Erhai-lake
 * 版本: 3.0.0
 * 日期: 2026-06-02
 * GitHub: https://github.com/Erhai-lake/js-lib
 *
 * =================================================================
 * 使用手册 (Usage Guide)
 * =================================================================
 * import {IndexDB} from "./indexDB.js"
 *
 * 初始化数据库与物理表 (语法: "主键, 索引1, 索引2...", 主键前加 $$ 代表自增):
 * const db = new IndexDB("SnakeGameDB", {
 * replays: "id, mode",        // 自定义物理表 1: replays, 主键为 id
 * userSettings: "settingKey", // 自定义物理表 2: userSettings, 主键为 settingKey
 * scores: "$$id, score"       // 自定义物理表 3: scores, 主键为 id 且自增
 * }, 1)
 *
 * 基础存取 (通过表名属性链式调用):
 * await db.replays.put({ id: "replay-001", mode: "classic", frames: [...] })
 * const data = await db.replays.get("replay-001")
 *
 * 批量操作与全量获取:
 * await db.replays.bulkPut([{ id: "k1", val: 1 }, { id: "k2", val: 2 }])
 * const allData = await db.replays.toArray()
 *
 * 删除与清空:
 * await db.replays.delete("replay-001")
 * await db.replays.clear()
 */

// 数据库连接缓存池
const cachedDBs = new Map()

// 正在打开的数据库 Promise 挂起池, 防止并发重复创建连接
const openPromises = new Map()

export class IndexDB {
	/**
	 * 初始化数据库实例
	 * @param {string} dbName 数据库名称
	 * @param {Object} schemas 表结构配置. 例如: {replays: "id", scores: "$$id, score"}
	 * @param {number} [version=1] 数据库版本号
	 */
	constructor(dbName, schemas = {}, version = 1) {
		this.dbName = dbName
		this.schemas = schemas
		this.version = version

		// 核心动态代理: 拦截属性访问, 实现 db.tableName.method()
		return new Proxy(this, {
			get: (target, prop) => {
				// 如果访问的是实例本身已有的标准属性或方法, 正常返回
				if (prop in target) return target[prop]
				// 如果访问的是配置中的表名, 则动态返回该表的 API 操作集
				if (target.schemas[prop] !== undefined) {
					return target._createTableOperator(prop)
				}
				return undefined
			}
		})
	}

	/**
	 * 打开或获取指定的 IndexedDB 数据库连接
	 * @returns {Promise<IDBDatabase>}
	 * @private
	 */
	_open() {
		if (cachedDBs.has(this.dbName)) {
			return Promise.resolve(cachedDBs.get(this.dbName))
		}
		if (openPromises.has(this.dbName)) {
			return openPromises.get(this.dbName)
		}
		const promise = new Promise((resolve, reject) => {
			const REQUEST = indexedDB.open(this.dbName, this.version)
			REQUEST.onupgradeneeded = (event) => {
				const DB = event.target.result
				for (const [tableName, storeConfig] of Object.entries(this.schemas)) {
					if (!DB.objectStoreNames.contains(tableName)) {
						// 解析配置, 例如 "$$id, name, age"
						const PARTS = storeConfig.split(",").map(s => s.trim())
						const PRIMARY_KEY = PARTS[0]
						// 判断是否为自增主键 (形如 $$id)
						const IS_AUTO_INCREMENT = PRIMARY_KEY.startsWith("$$")
						const KEY_PATH = IS_AUTO_INCREMENT ? PRIMARY_KEY.replace("$$", "") : PRIMARY_KEY
						// 创建真实的物理 ObjectStore
						const STORE = DB.createObjectStore(tableName, {
							keyPath: KEY_PATH || "id",
							autoIncrement: IS_AUTO_INCREMENT
						})
						// 循环创建其余的非主键索引字段
						for (let i = 1; i < PARTS.length; i++) {
							STORE.createIndex(PARTS[i], PARTS[i], { unique: false })
						}
					}
				}
			}
			// 数据库打开成功
			REQUEST.onsuccess = (event) => {
				const DB_INSTANCE = event.target.result
				cachedDBs.set(this.dbName, DB_INSTANCE)
				openPromises.delete(this.dbName)
				// 监听版本变更或异常关闭, 清除连接缓存
				DB_INSTANCE.onversionchange = () => {
					DB_INSTANCE.close()
					cachedDBs.delete(this.dbName)
				}
				resolve(DB_INSTANCE)
			}
			// 数据库打开失败
			REQUEST.onerror = (event) => {
				openPromises.delete(this.dbName)
				reject(new Error(`IDB Error: 无法打开数据库 [${this.dbName}], 原因: ${event.target.error?.message || "未知"}`))
			}
		})
		openPromises.set(this.dbName, promise)
		return promise
	}

	/**
	 * 核心通用的单表事务执行器
	 * @private
	 */
	_runTransaction(tableName, txMode, callback) {
		return this._open().then((db) => {
			return new Promise((resolve, reject) => {
				const TX = db.transaction(tableName, txMode)
				const STORE = TX.objectStore(tableName)
				const REQUEST = callback(STORE)
				if (REQUEST) {
					REQUEST.onsuccess = () => resolve(REQUEST.result)
					REQUEST.onerror = () => reject(REQUEST.error)
				}
				TX.oncomplete = () => {
					if (!REQUEST) resolve(true)
				}
				TX.onerror = () => reject(TX.error)
				TX.onabort = () => reject(new Error("IDB Error: 事务被终止"))
			})
		})
	}

	/**
	 * 为指定的物理表动态构建 API 操作集
	 * @private
	 */
	_createTableOperator(tableName) {
		const SELF = this
		return {
			/**
			 * 写入或更新单条数据记录
			 * @param {Object} row 要写入的数据对象
			 * @returns {Promise<*>} 写入成功返回生成/传入的主键, 失败返回 null
			 */
			async put(row) {
				try {
					return await SELF._runTransaction(tableName, "readwrite", (store) => store.put(row))
				} catch (error) {
					console.error(`TinyDexie [${SELF.dbName}.${tableName}] Put Error:`, error.message)
					return null
				}
			},

			/**
			 * 批量原子级写入多条数据记录
			 * @param {Object[]} rowsArray 数据对象数组
			 * @returns {Promise<boolean>} 是否批量写入成功
			 */
			async bulkPut(rowsArray) {
				try {
					return await SELF._runTransaction(tableName, "readwrite", (store) => {
						rowsArray.forEach(row => store.put(row))
					})
				} catch (error) {
					console.error(`TinyDexie [${SELF.dbName}.${tableName}] BulkPut Error:`, error.message)
					return false
				}
			},

			/**
			 * 根据主键读取单条数据
			 * @param {*} primaryKey 主键的值
			 * @returns {Promise<*|null>} 返回查找到的数据对象, 不存在或异常时返回 null
			 */
			async get(primaryKey) {
				try {
					const RESULT = await SELF._runTransaction(tableName, "readonly", (store) => store.get(primaryKey))
					return RESULT !== undefined ? RESULT : null
				} catch (error) {
					console.error(`TinyDexie [${SELF.dbName}.${tableName}] Get Error:`, error.message)
					return null
				}
			},

			/**
			 * 获取当前表下的全量数据列表
			 * @returns {Promise<Object[]>} 返回包含全量数据的数组, 失败时返回空数组
			 */
			async toArray() {
				try {
					return await SELF._runTransaction(tableName, "readonly", (store) => store.getAll())
				} catch (error) {
					console.error(`TinyDexie [${SELF.dbName}.${tableName}] ToArray Error:`, error.message)
					return []
				}
			},

			/**
			 * 根据主键删除单条数据记录
			 * @param {*} primaryKey 主键的值
			 * @returns {Promise<boolean>} 是否删除成功
			 */
			async delete(primaryKey) {
				try {
					await SELF._runTransaction(tableName, "readwrite", (store) => store.delete(primaryKey))
					return true
				} catch (error) {
					console.error(`TinyDexie [${SELF.dbName}.${tableName}] Delete Error:`, error.message)
					return false
				}
			},

			/**
			 * 清空当前物理表下的全部数据
			 * @returns {Promise<boolean>} 是否清空成功
			 */
			async clear() {
				try {
					await SELF._runTransaction(tableName, "readwrite", (store) => store.clear())
					return true
				} catch (error) {
					console.error(`TinyDexie [${SELF.dbName}.${tableName}] Clear Error:`, error.message)
					return false
				}
			}
		}
	}
}
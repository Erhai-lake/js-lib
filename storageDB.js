/**
 * =================================================================
 * 信息 (Information)
 * =================================================================
 * StorageDB 是一个基于 localStorage / sessionStorage 的
 * 轻量级数据库式存储服务.
 *
 * 采用:
 * Database -> Path(Key)
 * 的两级结构管理数据.
 *
 * 支持:
 * 1. 自动 JSON 序列化/反序列化
 * 2. 路径访问 (a.b.c)
 * 3. TTL 过期控制
 * 4. 响应式订阅
 * 5. 跨标签页同步
 * 6. 批量操作
 * 7. watchPath 精确监听
 * 8. ensure 默认值初始化
 * 9. ttl 剩余时间查询
 * 10. 自动过期清理
 *
 * -----------------------------------------------------------------
 * 数据结构
 * -----------------------------------------------------------------
 *
 * {
 *   data: {},
 *   expiry: {},
 *   meta: {
 *     version: 1,
 *     updatedAt: 0
 *   }
 * }
 *
 * -----------------------------------------------------------------
 * 使用示例
 * -----------------------------------------------------------------
 *
 * import storageDB, {SESSION, LOCAL} from "@/services/storageDB.js"
 *
 * -----------------------------------------------------------------
 * 基础读写
 * -----------------------------------------------------------------
 *
 * storageDB.set(LOCAL, "config", "user.profile.name", "Erhai")
 *
 * const NAME = storageDB.get(LOCAL, "config", "user.profile.name")
 *
 * -----------------------------------------------------------------
 * TTL
 * -----------------------------------------------------------------
 *
 * storageDB.set(LOCAL, "auth", "token", "abc123", 3600000)
 *
 * -----------------------------------------------------------------
 * ensure
 * -----------------------------------------------------------------
 *
 * const THEME = storageDB.ensure(LOCAL, "config", "theme", "light")
 *
 * -----------------------------------------------------------------
 * watch
 * -----------------------------------------------------------------
 *
 * const unwatch = storageDB.watch(LOCAL, "config", "user.profile", (event) => {
 *		console.log(event)
 * })
 *
 * -----------------------------------------------------------------
 * batch
 * -----------------------------------------------------------------
 *
 * storageDB.batch(LOCAL, "config", (db) => {
 *   db.set("user.name", "Erhai")
 *   db.set("user.age", 18)
 * })
 *
 * -----------------------------------------------------------------
 * 作者: Erhai-lake
 * 版本: 2.0.0
 * 日期: 2026-06-08
 * GitHub: https://github.com/Erhai-lake
 * =================================================================
 */

// 存储数据库对象
const storageDB = {}

// 会话存储
const SESSION = 0
// 本地存储
const LOCAL = 1

/**
 * 订阅列表
 */
const callbacks = new Set()

/**
 * 获取 Storage 实例
 * @param {number} type
 */
const getStorage = (type) => {
	return type === LOCAL ? localStorage : sessionStorage
}

/**
 * 订阅变动事件
 * @param {function} callback 变动事件回调函数
 */
storageDB.subscribe = (callback) => {
	callbacks.add(callback)
	return () => callbacks.delete(callback)
}

/**
 * 获取当前时间
 */
const NOW = () => Date.now()

/**
 * 创建默认数据库结构
 */
const createEmptyDatabase = () => ({
	data: {},
	expiry: {},
	meta: {
		version: 1,
		updatedAt: NOW()
	}
})

/**
 * 路径转数组
 * @param {string} path
 */
const pathToArray = (path) => {
	if (!path || typeof path !== "string") return []
	return path.split(".").filter(Boolean)
}

/**
 * 深拷贝
 * @param {*} value
 */
const clone = (value) => {
	try {
		return structuredClone(value)
	} catch {
		return JSON.parse(JSON.stringify(value))
	}
}

/**
 * 获取路径值
 * @param {object} obj
 * @param {string} path
 */
const getByPath = (obj, path) => {
	const KEYS = pathToArray(path)
	let current = obj
	for (const KEY of KEYS) {
		if (current == null || typeof current !== "object") return undefined
		current = current[KEY]
	}
	return current
}

/**
 * 设置路径值
 * @param {object} obj
 * @param {string} path
 * @param {*} value
 */
const setByPath = (obj, path, value) => {
	const KEYS = pathToArray(path)
	let current = obj
	for (let i = 0; i < KEYS.length - 1; i++) {
		const KEY = KEYS[i]
		if (typeof current[KEY] !== "object" || current[KEY] === null) current[KEY] = {}
		current = current[KEY]
	}
	current[KEYS[KEYS.length - 1]] = value
}

/**
 * 删除路径
 * @param {object} obj
 * @param {string} path
 */
const deleteByPath = (obj, path) => {
	const KEYS = pathToArray(path)
	const LAST = KEYS.pop()
	if (!LAST) return false
	let current = obj
	for (const KEY of KEYS) {
		if (current[KEY] == null || typeof current[KEY] !== "object") return false
		current = current[KEY]
	}
	if (Object.prototype.hasOwnProperty.call(current, LAST)) {
		delete current[LAST]
		return true
	}
	return false
}

/**
 * 初始化数据库
 * @param {number} type
 * @param {string} name
 */
const initDatabase = (type, name) => {
	const STORAGE = getStorage(type)
	if (!STORAGE.getItem(name)) STORAGE.setItem(name, JSON.stringify(createEmptyDatabase()))
}

/**
 * 获取数据库
 * @param {number} type
 * @param {string} name
 */
const getDatabase = (type, name) => {
	const STORAGE = getStorage(type)
	initDatabase(type, name)
	try {
		const RAW = STORAGE.getItem(name)
		const DB = JSON.parse(RAW)
		if (typeof DB !== "object" || DB === null) {
			console.error("Invalid database")
			return
		}
		if (!DB.data) DB.data = {}
		if (!DB.expiry) DB.expiry = {}
		if (!DB.meta) {
			DB.meta = {
				version: 1,
				updatedAt: NOW()
			}
		}
		return DB
	} catch (error) {
		console.error("StorageDB Error: 获取数据库失败", name, error)
		return createEmptyDatabase()
	}
}

/**
 * 保存数据库
 * @param {number} type
 * @param {string} name
 * @param {object} db
 */
const saveDatabase = (type, name, db) => {
	const STORAGE = getStorage(type)
	db.meta.updatedAt = NOW()
	db.meta.version++
	try {
		STORAGE.setItem(name, JSON.stringify(db))
	} catch (error) {
		if (error.name === "QuotaExceededError") {
			console.error("StorageDB Error: 存储空间已满", name)
		}
	}
}

/**
 * 通知订阅者
 * @param {object} event
 */
const notify = (event) => {
	callbacks.forEach(cb => {
		try {
			cb(event)
		} catch (error) {
			console.error("StorageDB Error: 订阅回调异常", error)
		}
	})
}

/**
 * 创建事件对象
 */
const createEvent = ({type, name, path, action, oldValue, newValue}) => ({
	type,
	name,
	path,
	action,
	oldValue,
	newValue,
	timestamp: NOW()
})

/**
 * 检查是否过期
 * @param {object} db
 * @param {string} path
 */
const isExpired = (db, path) => {
	const EXPIRY = db.expiry[path]
	if (!EXPIRY) {
		return false
	}
	return NOW() > EXPIRY
}

/**
 * 清理过期
 * @param {number} type
 * @param {string} name
 * @param {string} path
 */
const cleanupExpired = (type, name, path) => {
	const DB = getDatabase(type, name)
	if (!isExpired(DB, path)) return false
	const OLD = getByPath(DB.data, path)
	deleteByPath(DB.data, path)
	delete DB.expiry[path]
	saveDatabase(type, name, DB)
	notify(createEvent({
		type,
		name,
		path,
		action: "expired",
		oldValue: OLD,
		newValue: undefined
	}))
	return true
}

/**
 * 自动 GC
 * @param {number} type
 * @param {string} name
 */
const garbageCollect = (type, name) => {
	const DB = getDatabase(type, name)
	let changed = false
	for (const PATH in DB.expiry) {
		if (NOW() > DB.expiry[PATH]) {
			deleteByPath(DB.data, PATH)
			delete DB.expiry[PATH]
			changed = true
		}
	}
	if (changed) {
		saveDatabase(type, name, DB)
	}
}

/**
 * 订阅全部事件
 * @param {function} callback
 */
storageDB.subscribe = (callback) => {
	callbacks.add(callback)
	return () => {
		callbacks.delete(callback)
	}
}

/**
 * 精确监听路径
 * @param {number} type
 * @param {string} name
 * @param {string} watchPath
 * @param {function} callback
 */
storageDB.watch = (type, name, watchPath, callback) => {
	return storageDB.subscribe((event) => {
		if (event.type === type && event.name === name && event.path && event.path.startsWith(watchPath)) callback(event)
	})
}

/**
 * 获取值
 * @param {number} type
 * @param {string} name
 * @param {string} path
 * @param {*} defaultValue
 */
storageDB.get = (type, name, path, defaultValue = undefined) => {
	cleanupExpired(type, name, path)
	const DB = getDatabase(type, name)
	const VALUE = getByPath(DB.data, path)
	return VALUE === undefined ? defaultValue : VALUE
}

/**
 * 设置值
 * @param {number} type
 * @param {string} name
 * @param {string} path
 * @param {*} value
 * @param {number} ttl
 */
storageDB.set = (type, name, path, value, ttl = 0) => {
	const DB = getDatabase(type, name)
	const OLD = getByPath(DB.data, path)
	setByPath(DB.data, path, value)
	if (ttl > 0) {
		DB.expiry[path] = NOW() + ttl
	} else {
		delete DB.expiry[path]
	}
	saveDatabase(type, name, DB)
	notify(createEvent({
		type,
		name,
		path,
		action: "set",
		oldValue: clone(OLD),
		newValue: clone(value)
	}))
	return value
}

/**
 * 确保存在
 * @param {number} type
 * @param {string} name
 * @param {string} path
 * @param {*} defaultValue
 * @param {number} ttl
 */
storageDB.ensure = (type, name, path, defaultValue, ttl = 0) => {
	const VALUE = storageDB.get(type, name, path)
	if (VALUE !== undefined) return VALUE
	return storageDB.set(type, name, path, defaultValue, ttl)
}

/**
 * 删除值
 * @param {number} type
 * @param {string} name
 * @param {string} path
 */
storageDB.delete = (type, name, path) => {
	const DB = getDatabase(type, name)
	const OLD = getByPath(DB.data, path)
	const SUCCESS = deleteByPath(DB.data, path)
	if (!SUCCESS) return false
	delete DB.expiry[path]
	saveDatabase(type, name, DB)
	notify(createEvent({
		type,
		name,
		path,
		action: "delete",
		oldValue: clone(OLD),
		newValue: undefined
	}))
	return true
}

/**
 * 判断是否存在
 * @param {number} type
 * @param {string} name
 * @param {string} path
 */
storageDB.has = (type, name, path) => {
	cleanupExpired(type, name, path)
	const DB = getDatabase(type, name)
	return (getByPath(DB.data, path) !== undefined)
}

/**
 * 设置过期时间
 * @param {number} type
 * @param {string} name
 * @param {string} path
 * @param {number} ttl
 */
storageDB.expire = (type, name, path, ttl) => {
	const DB = getDatabase(type, name)
	if (getByPath(DB.data, path) === undefined) return false
	DB.expiry[path] = NOW() + ttl
	saveDatabase(type, name, DB)
	return true
}

/**
 * 获取剩余 TTL
 * @param {number} type
 * @param {string} name
 * @param {string} path
 */
storageDB.ttl = (type, name, path) => {
	cleanupExpired(type, name, path)
	const DB = getDatabase(type, name)
	const expiry = DB.expiry[path]
	if (!expiry) return 0
	return Math.max(0, expiry - NOW())
}

/**
 * 清空数据库
 * @param {number} type
 * @param {string} name
 */
storageDB.clear = (type, name) => {
	const STORAGE = getStorage(type)
	STORAGE.removeItem(name)
	notify(createEvent({
		type,
		name,
		path: null,
		action: "clear",
		oldValue: null,
		newValue: null
	}))
}

/**
 * 导出数据库
 * @param {number} type
 * @param {string} name
 */
storageDB.export = (type, name) => {
	return clone(getDatabase(type, name))
}

/**
 * 导入数据库
 * @param {number} type
 * @param {string} name
 * @param {object} data
 */
storageDB.import = (type, name, data) => {
	if (typeof data !== "object" || data === null) {
		console.error("StorageDB Error: 导入数据格式错误")
		return false
	}
	saveDatabase(type, name, data)
	notify(createEvent({
		type,
		name,
		path: null,
		action: "import",
		oldValue: null,
		newValue: clone(data)
	}))
	return true
}

/**
 * 批量操作
 * @param {number} type
 * @param {string} name
 * @param {function} callback
 */
storageDB.batch = (type, name, callback) => {
	const DB = getDatabase(type, name)
	const api = {
		get(path) {
			return getByPath(DB.data, path)
		},
		set(path, value, ttl = 0) {
			setByPath(DB.data, path, value)
			if (ttl > 0) DB.expiry[path] = NOW() + ttl
		},
		delete(path) {
			deleteByPath(DB.data, path)
			delete DB.expiry[path]
		}
	}
	callback(api)
	saveDatabase(type, name, DB)
	notify(createEvent({
		type,
		name,
		path: null,
		action: "batch",
		oldValue: null,
		newValue: clone(DB.data)
	}))
}

/**
 * 手动 GC
 * @param {number} type
 * @param {string} name
 */
storageDB.gc = (type, name) => {
	garbageCollect(type, name)
}

/**
 * 跨标签页同步
 */
window.addEventListener(
	"storage",
	(event) => {
		if (!event.key || !event.newValue) return
		try {
			const NEW_DB = JSON.parse(event.newValue)
			notify(createEvent({
				type: event.storageArea === localStorage ? LOCAL : SESSION,
				name: event.key,
				path: null,
				action: "storage",
				oldValue: null,
				newValue: NEW_DB
			}))
		} catch {
		}
	}
)

export default storageDB
export {SESSION, LOCAL}
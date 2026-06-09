/**
 * =================================================================
 * 信息 (Information)
 * =================================================================
 * 该服务提供一个高性能/模块化的宇宙电子轨道与多重激波模拟系统.
 * 采用纯闭包函数架构, 通过直接绑定 DOM 容器动态生成 Canvas.
 * * * 特性:
 * 1. 弹性粒子矩阵: 动态维护星体粒子分流渲染, 支持状态机平滑切换.
 * 2. 弱引力向心捕获: 基于距离平方衰减公式, 实现多层次的缓动向心聚拢.
 * 3. 电子绕转轨道: 支持粒子动态越界判定, 自动捕获并切换为黄金交叉原子轨道模式.
 * 4. 多普勒高能激波: 鼠标点击触发高能扩散环, 粒子碰撞前瞬间完美继承多普勒极光色.
 * 5. 动态配置注入: 支持通过第二个参数传入定制化对象, 动态覆盖默认物理常数指标.
 * 6. 内存安全管理: 内置自动化防溢出机制与精密事件销毁钩子 (destroy), 杜绝内存泄漏.
 * 7. 长按超新星坍缩[v1.3.0]: 鼠标长按可激活宇宙引力奇点, 全场粒子做向心漩涡塌陷, 释放时触发大爆炸.
 * 8. 光速星尘流星雨[v1.2.0]: 周期性生成横穿夜空的彗尾流星, 受到激波拦截时碎裂为次级高能火花.
 * 9. 激波极光连锁网[v1.2.0]: 粒子捕获激波瞬间向邻近低能级星体拉出极光能量传导闪电链.
 *
 * 作者: Erhai-lake
 * 版本: 1.3.0
 * 日期: 2026-06-09
 * GitHub: https://github.com/Erhai-lake/js-lib
 *
 * =================================================================
 * 使用手册 (Usage Guide)
 * =================================================================
 * * 导入方式:
 * import {initUniverseSimulation} from "@/utils/universeSimulation.js"
 * * * 核心概念:
 * 1. containerElement: 绑定的外部容器 (推荐使用 div 元素), 系统将自动动态创建 Canvas.
 * 2. configOptions: 可选的定制配置对象, 用于自定义物理世界常数.
 *
 * * 1. 默认配置初始化[v1.0.0]:
 * const CONTAINER = document.getElementById("space-wrapper")
 * const UNIVERSE_APP = initUniverseSimulation(CONTAINER)
 *
 * * 2. 自定义高负载炫彩流初始化[v1.1.0]:
 * const HIGH_PERF_CONTAINER = document.getElementById("high-perf-space")
 * const CONFIG = {
 * 		particleCount: 3000,     // 暴增粒子到 3000 个
 * 		baseGravity: 0.15,       // 加强核心引力系数
 * 		maxShockwave: 20         // 允许同时存在 20 个高能激波
 * }
 * const EXTRA_APP = initUniverseSimulation(HIGH_PERF_CONTAINER, CONFIG)
 *
 * * 3. 安全销毁与内存释放[v1.0.0]:
 * UNIVERSE_APP.destroy()
 */

/**
 * 初始化宇宙电子轨道与多重激波模拟系统
 * @param containerElement - 绑定的外部容器 (推荐使用 div 元素), 系统将自动动态创建 Canvas.
 * @param configOptions - 可选的定制配置对象, 用于自定义物理世界常数.
 * @return {{destroy: function(): void}} - 包含销毁方法的对象, 用于安全释放资源.
 */
export const initUniverseSimulation = (containerElement, configOptions = {
	particleCount: 1500,
	baseGravity: 0.08,
	friction: 0.97,
	explodeForce: 18,
	maxShockwave: 10,
	orbitEasing: 0.08,
	waveSpeed: 10,
	meteorFrequency: 0.008,
	meteorMaxCount: 15,
	lightningChainLen: 3,
	lightningMaxDist: 80,
	supernovaDuration: 120,
	chargeMaxFrames: 90,
	supernovaPullForce: 2.5
}) => {
	if (!containerElement) {
		console.error("未能找到有效的绑定容器元素")
		return {
			destroy: () => {
			}
		}
	}

	const CANVAS = document.createElement("canvas")
	const CTX = CANVAS.getContext("2d")

	CANVAS.style.display = "block"
	CANVAS.style.width = "100%"
	CANVAS.style.height = "100%"
	containerElement.style.overflow = "hidden"
	containerElement.appendChild(CANVAS)

	// 渲染的星体粒子总数 (默认: 1500)
	const PARTICLE_COUNT = configOptions.particleCount ?? 1500
	// 弱引力系统的基础引力常数系数 (默认: 0.08)
	const BASE_GRAVITY = configOptions.baseGravity ?? 0.08
	// 空间运动阻尼(摩擦系数), 用于防止粒子无休止惯性漂移 (默认: 0.97)
	const FRICTION = configOptions.friction ?? 0.97
	// 触发爆炸时作用于粒子的核心外溢速度基准 (默认: 18)
	const EXPLODE_FORCE = configOptions.explodeForce ?? 18
	// 屏幕中允许同时共存的最大激波(冲击波)数量, 用于保障 Canvas 渲染性能 (默认: 10)
	const MAX_SHOCKWAVE = configOptions.maxShockwave ?? 10
	// 轨道核心追随鼠标的缓动系数 (默认: 0.08)
	const ORBIT_EASING = configOptions.orbitEasing ?? 0.08
	// 激波扩散速度 (默认: 10)
	const WAVE_SPEED = configOptions.waveSpeed ?? 10
	// 每帧生成流星的概率基础 (默认: 0.008)
	const METEOR_FREQUENCY = configOptions.meteorFrequency ?? 0.008
	// 视口内允许同时存在的最大流星数 (默认: 15)
	const METEOR_MAX_COUNT = configOptions.meteorMaxCount ?? 15
	// 激波极光链单次连锁的最大星体数 (默认: 3)
	const LIGHTNING_CHAIN_LEN = configOptions.lightningChainLen ?? 3
	// 极光闪电链允许传导的最大物理距离 (默认: 80)
	const LIGHTNING_MAX_DIST = configOptions.lightningMaxDist ?? 80
	// 超新星坍缩全周期的动画帧数 (默认: 120)
	const SUPERNOVA_DURATION = configOptions.supernovaDuration ?? 120
	// 长按超新星坍缩的动画帧数 (默认: 90)
	const CHARGE_MAX_FRAMES = configOptions.chargeMaxFrames ?? 90
	// 长按超新星坍缩的引力常数系数 (默认: 2.5)
	const SUPERNOVA_PULL_FORCE = configOptions.supernovaPullForce ?? 2.5

	let width = CANVAS.width = containerElement.clientWidth
	let height = CANVAS.height = containerElement.clientHeight
	let mouseX = width / 2
	let mouseY = height / 2
	let orbitCenterX = width / 2
	let orbitCenterY = height / 2
	let waveIdCounter = 0
	let isMouseDown = false
	let chargeTimeoutId = null

	let shockwaveArray = []
	let meteorArray = []
	let lightningChainArray = []
	const STARS_ARRAY = []

	// 超新星奇点状态机
	let supernovaState = {
		active: false,
		timer: 0,
		chargeProgress: 0,
		x: 0,
		y: 0,
		// none | implode | explode
		phase: "none"
	}

	/**
	 * 创建激波数据对象
	 * @param {number} x - 激波中心水平坐标
	 * @param {number} y - 激波中心垂直坐标
	 * @returns {Object} - 包含激波数据的对象
	 */
	const createShockwave = (x, y) => {
		return {
			id: waveIdCounter++,
			x: x,
			y: y,
			radius: 0,
			lastRadius: 0,
			maxRadius: Math.max(width, height) * 0.8,
			speed: WAVE_SPEED,
			active: true,
			waveColor: Math.random() * 360
		}
	}

	/**
	 * 更新单个激波
	 * @param {Object} wave - 包含激波数据的对象
	 */
	const updateShockwave = (wave) => {
		wave.lastRadius = wave.radius
		wave.radius += wave.speed
		if (wave.radius >= wave.maxRadius) {
			wave.active = false
		}
	}

	/**
	 * 渲染单个激波
	 * @param {Object} wave - 包含激波数据的对象
	 */
	const drawShockwave = (wave) => {
		let progress = wave.radius / wave.maxRadius
		let alpha = 1 - progress

		CTX.save()

		CTX.beginPath()
		CTX.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2)
		CTX.strokeStyle = `hsla(${wave.waveColor}, 90%, 70%, ${alpha * 0.3})`
		CTX.lineWidth = 3 * (1 - progress)
		CTX.stroke()

		let waveGlow = CTX.createRadialGradient(
			wave.x, wave.y, wave.radius * 0.8,
			wave.x, wave.y, wave.radius
		)
		waveGlow.addColorStop(0, "rgba(100, 50, 255, 0)")
		waveGlow.addColorStop(0.8, `hsla(${wave.waveColor}, 80%, 60%, ${alpha * 0.08})`)
		waveGlow.addColorStop(1, "rgba(255, 255, 255, 0)")

		CTX.beginPath()
		CTX.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2)
		CTX.fillStyle = waveGlow
		CTX.fill()

		CTX.restore()
	}

	/**
	 * 激波调度控制器
	 */
	const handleShockwave = () => {
		shockwaveArray = shockwaveArray.filter(wave => wave.active)
		shockwaveArray.forEach(wave => {
			updateShockwave(wave)
			drawShockwave(wave)
		})
	}

	/**
	 * 生成高能极光链闪电网
	 */
	const generateLightningChain = (startStar, waveColor) => {
		if (lightningChainArray.length > MAX_SHOCKWAVE * 3) {
			return
		}
		let currentSource = startStar
		let localChain = [currentSource]
		let visitedIds = new Set([currentSource.id])

		for (let step = 0; step < LIGHTNING_CHAIN_LEN; step++) {
			let closestTarget = null
			let minDist = LIGHTNING_MAX_DIST

			for (let i = 0; i < STARS_ARRAY.length; i++) {
				let potentialTarget = STARS_ARRAY[i]
				if (potentialTarget.id === currentSource.id || visitedIds.has(potentialTarget.id)) {
					continue
				}

				if (potentialTarget.isExploding && step > 0) {
					continue
				}

				let dx = potentialTarget.x - currentSource.x
				let dy = potentialTarget.y - currentSource.y
				// 使用平方和先做初筛, 避免高频执行消耗性能
				let distSq = dx * dx + dy * dy

				if (distSq < minDist * minDist) {
					let dist = Math.sqrt(distSq)
					if (dist < minDist) {
						minDist = dist
						closestTarget = potentialTarget
					}
				}
			}

			// 一旦发现最近的星体都超过了传导距离, 立刻斩断链条, 杜绝远距离拉丝
			if (closestTarget && minDist < LIGHTNING_MAX_DIST) {
				localChain.push(closestTarget)
				visitedIds.add(closestTarget.id)
				currentSource = closestTarget
			} else {
				break
			}
		}

		if (localChain.length > 1) {
			lightningChainArray.push({
				nodes: localChain,
				colorAngle: waveColor,
				life: 8,
				maxLife: 8
			})
		}
	}

	/**
	 * 渲染并管理极光闪电网
	 */
	const handleLightningChains = () => {
		lightningChainArray = lightningChainArray.filter(chain => chain.life > 0)
		lightningChainArray.forEach(chain => {
			let alpha = chain.life / chain.maxLife
			CTX.save()
			CTX.strokeStyle = `hsla(${chain.colorAngle}, 100%, 75%, ${alpha * 0.7})`
			CTX.lineWidth = 1.5 * alpha
			CTX.shadowBlur = 8
			CTX.shadowColor = `hsla(${chain.colorAngle}, 100%, 60%, ${alpha})`

			CTX.beginPath()
			CTX.moveTo(chain.nodes[0].x, chain.nodes[0].y)

			for (let i = 1; i < chain.nodes.length; i++) {
				let fromNode = chain.nodes[i - 1]
				let toNode = chain.nodes[i]
				let midX = (fromNode.x + toNode.x) / 2
				let midY = (fromNode.y + toNode.y) / 2

				// 注入混沌空间扰动偏移, 营造拟真折线极光雷电感
				let offsetX = (Math.random() - 0.5) * 12
				let offsetY = (Math.random() - 0.5) * 12

				CTX.lineTo(midX + offsetX, midY + offsetY)
				CTX.lineTo(toNode.x, toNode.y)
			}
			CTX.stroke()
			CTX.restore()
			chain.life--
		})
	}

	/**
	 * 创建彗尾流星
	 */
	const createMeteor = () => {
		let fromLeft = Math.random() > 0.5
		let startX = fromLeft ? -20 : width + 20
		let startY = Math.random() * (height * 0.6)
		let angle = fromLeft ? Math.random() * 0.5 : Math.PI - Math.random() * 0.5
		let mSpeed = 12 + Math.random() * 8

		return {
			x: startX,
			y: startY,
			vx: Math.cos(angle) * mSpeed,
			vy: Math.sin(angle) * mSpeed,
			size: 2.5 + Math.random() * 2,
			colorAngle: 180 + Math.random() * 40,
			active: true,
			history: []
		}
	}

	/**
	 * 流星雨物理驱动与激波拦截判定系统
	 */
	const handleMeteors = () => {
		if (Math.random() < METEOR_FREQUENCY && meteorArray.length < METEOR_MAX_COUNT) {
			meteorArray.push(createMeteor())
		}

		meteorArray = meteorArray.filter(m => m.active)
		meteorArray.forEach(m => {
			m.history.push({x: m.x, y: m.y})
			if (m.history.length > 8) {
				m.history.shift()
			}

			m.x += m.vx
			m.y += m.vy

			// 边界判定
			if (m.x < -100 || m.x > width + 100 || m.y > height + 100) {
				m.active = false
				return
			}

			// 拦截判定: 检查是否碰到了扩散中的激波面
			for (let i = 0; i < shockwaveArray.length; i++) {
				let wave = shockwaveArray[i]
				let dx = m.x - wave.x
				let dy = m.y - wave.y
				let dist = Math.sqrt(dx * dx + dy * dy)

				if (dist >= wave.lastRadius - 8 && dist <= wave.radius + 8) {
					m.active = false
					// 彗核物理碎裂效应: 在撞击点就地爆发释放多颗高能次级粒子
					for (let k = 0; k < 12; k++) {
						let scatterStar = createStar()
						scatterStar.x = m.x
						scatterStar.y = m.y
						let sAngle = Math.random() * Math.PI * 2
						let sSpeed = (Math.random() * 0.5 + 0.5) * EXPLODE_FORCE * 1.2
						scatterStar.vx = Math.cos(sAngle) * sSpeed
						scatterStar.vy = Math.sin(sAngle) * sSpeed
						scatterStar.isExploding = true
						scatterStar.explodeTimer = 50
						scatterStar.colorAngle = wave.waveColor
						STARS_ARRAY.push(scatterStar)
					}
					break
				}
			}

			// 绘制流星高能彗尾
			if (m.history.length > 1) {
				CTX.save()
				for (let i = 1; i < m.history.length; i++) {
					let p1 = m.history[i - 1]
					let p2 = m.history[i]
					let alpha = i / m.history.length
					CTX.strokeStyle = `hsla(${m.colorAngle}, 100%, 75%, ${alpha * 0.4})`
					CTX.lineWidth = m.size * alpha
					CTX.beginPath()
					CTX.moveTo(p1.x, p1.y)
					CTX.lineTo(p2.x, p2.y)
					CTX.stroke()
				}

				// 彗核核心高亮
				CTX.beginPath()
				CTX.arc(m.x, m.y, m.size, 0, Math.PI * 2)
				CTX.fillStyle = "#fff"
				CTX.fill()
				CTX.restore()
			}
		})
	}

	/**
	 * 执行超新星量子大爆炸
	 */
	const triggerSupernovaExplosion = () => {
		supernovaState.phase = "explode"
		supernovaState.timer = SUPERNOVA_DURATION

		STARS_ARRAY.forEach(star => {
			star.isInOrbit = false
			let dx = star.x - supernovaState.x
			let dy = star.y - supernovaState.y
			let angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.4

			// 爆炸威力挂钩长按蓄力程度, 蓄满力威力最大
			let intensity = supernovaState.chargeProgress / CHARGE_MAX_FRAMES
			let boomForce = (2 + Math.random() * 3) * EXPLODE_FORCE * (0.5 + intensity * 0.5)

			star.vx = Math.cos(angle) * boomForce
			star.vy = Math.sin(angle) * boomForce
			star.isExploding = true
			star.explodeTimer = 60
			star.colorAngle = Math.random() * 360
			star.radius = star.baseRadius * 4
		})
	}

	/**
	 * 实时驱动长按蓄力及爆炸波形调度
	 */
	const handleSupernovaCore = () => {
		if (!supernovaState.active) {
			return
		}

		// 阶段一: 鼠标按下长按蓄力中
		if (supernovaState.phase === "charge") {
			if (isMouseDown) {
				if (supernovaState.chargeProgress < CHARGE_MAX_FRAMES) {
					supernovaState.chargeProgress++
				} else {
					// 蓄力强行充满, 直接原地被动引爆
					triggerSupernovaExplosion()
					return
				}
			}

			// 跟随当前的轨道微调质心坐标
			supernovaState.x = orbitCenterX
			supernovaState.y = orbitCenterY

			let progress = supernovaState.chargeProgress / CHARGE_MAX_FRAMES

			// 渲染时空裂缝坍缩漩涡
			CTX.save()
			let chargeGlow = CTX.createRadialGradient(
				supernovaState.x, supernovaState.y, 2,
				supernovaState.x, supernovaState.y, progress * 150
			)
			chargeGlow.addColorStop(0, `rgba(255, 255, 255, ${progress * 0.9})`)
			chargeGlow.addColorStop(0.2, `hsla(280, 100%, 70%, ${progress * 0.6})`)
			chargeGlow.addColorStop(0.5, `hsla(190, 100%, 50%, ${progress * 0.3})`)
			chargeGlow.addColorStop(1, "rgba(0, 0, 0, 0)")

			CTX.fillStyle = chargeGlow
			CTX.beginPath()
			CTX.arc(supernovaState.x, supernovaState.y, progress * 150, 0, Math.PI * 2)
			CTX.fill()
			CTX.restore()
		}
		// 阶段二: 爆发响应状态
		else if (supernovaState.phase === "explode") {
			supernovaState.timer--
			if (supernovaState.timer <= 0) {
				supernovaState.active = false
				supernovaState.phase = "none"
				supernovaState.chargeProgress = 0
				return
			}

			let outProgress = (SUPERNOVA_DURATION - supernovaState.timer) / SUPERNOVA_DURATION
			CTX.save()
			CTX.strokeStyle = `hsla(${Math.random() * 360}, 100%, 80%, ${1 - outProgress})`
			CTX.lineWidth = 15 * (1 - outProgress)
			CTX.beginPath()
			CTX.arc(supernovaState.x, supernovaState.y, outProgress * Math.max(width, height) * 1.2, 0, Math.PI * 2)
			CTX.stroke()
			CTX.restore()
		}
	}

	/**
	 * 重置单颗星星指标
	 * @param {Object} star - 包含星星数据的对象
	 */
	const resetStar = (star) => {
		star.id = star.id ?? Math.random()

		star.x = Math.random() * width
		star.y = Math.random() * height
		star.vx = (Math.random() - 0.5) * 0.5
		star.vy = (Math.random() - 0.5) * 0.5

		star.baseRadius = Math.random() * 0.6 + 0.8
		star.radius = star.baseRadius
		star.alpha = Math.random()
		star.blinkSpeed = 0.01 + Math.random() * 0.02
		star.baseColorAngle = 200 + Math.random() * 60
		star.colorAngle = star.baseColorAngle

		star.isExploding = false
		star.explodeTimer = 0

		star.orbitAngle = Math.random() * Math.PI * 2
		star.orbitSpeed = 0.1 + Math.random() * 0.15
		star.orbitPlaneAngle = Math.random() * Math.PI
		star.orbitRadiusX = 3 + Math.random() * 12
		star.orbitRadiusY = 1 + Math.random() * 4
		star.isInOrbit = false

		star.hitWaves = {}
	}

	/**
	 * 生成新粒子数据对象
	 * @returns {Object} - 包含星星数据的对象
	 */
	const createStar = () => {
		let star = {}
		resetStar(star)
		return star
	}

	/**
	 * 触发粒子爆发散射
	 * @param {Object} star - 包含星星数据的对象
	 * @param {Object} wave - 包含激波数据的对象
	 */
	const explodeStar = (star, wave) => {
		star.isInOrbit = false

		let dx = star.x - wave.x
		let dy = wave.y
		if (star.y !== undefined) {
			dy = star.y - wave.y
		}

		let angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.15
		let forceFactor = 1 / (1 + wave.radius * 0.001)
		let pushSpeed = (Math.random() * 0.4 + 0.6) * EXPLODE_FORCE * forceFactor

		// 如果是二次挨炸, 将新速度方向与原有的速度向量按比例融和, 形成复合弹道
		if (star.isExploding) {
			star.vx = star.vx * 0.4 + Math.cos(angle) * pushSpeed * 0.8
			star.vy = star.vy * 0.4 + Math.sin(angle) * pushSpeed * 0.8
		} else {
			star.vx = Math.cos(angle) * pushSpeed
			star.vy = Math.sin(angle) * pushSpeed
		}

		star.isExploding = true
		star.explodeTimer = 45

		star.radius = star.baseRadius * 3
		star.alpha = 1
		star.colorAngle = wave.waveColor
	}

	/**
	 * 三阶物理状态机更新
	 * @param {Object} star - 包含星星数据的对象
	 */
	const updateStar = (star) => {
		// 常规呼吸闪烁
		if (!star.isExploding) {
			star.alpha += star.blinkSpeed
			if (star.alpha > 1 || star.alpha < 0.2) {
				star.blinkSpeed = -star.blinkSpeed
			}
		}

		// 全场粒子进入无限螺旋聚拢坍缩态
		if (supernovaState.active && supernovaState.phase === "charge") {
			let sDx = supernovaState.x - star.x
			let sDy = supernovaState.y - star.y
			let sDist = Math.sqrt(sDx * sDx + sDy * sDy)

			if (sDist > 8) {
				let chargeRatio = supernovaState.chargeProgress / CHARGE_MAX_FRAMES
				let dynamicPull = SUPERNOVA_PULL_FORCE * (1 + chargeRatio * 2)

				// 基础向心吸力速度
				star.vx += (sDx / sDist) * dynamicPull
				star.vy += (sDy / sDist) * dynamicPull

				// 混入螺旋环绕切线切角, 产生星系星云剥离抽吸的黑洞漩涡感
				star.vx += (-sDy / sDist) * (dynamicPull * 0.6)
				star.vy += (sDx / sDist) * (dynamicPull * 0.6)

				star.vx *= 0.82
				star.vy *= 0.82
			} else {
				// 被完全剥离抽向黑洞奇点的粒子高频闪烁并处于重质态
				star.x = supernovaState.x + (Math.random() - 0.5) * 10
				star.y = supernovaState.y + (Math.random() - 0.5) * 10
				star.alpha = 1
				return
			}
			star.x += star.vx
			star.y += star.vy
			return
		}

		// 区间无缝激波拦截循环
		for (let i = 0; i < shockwaveArray.length; i++) {
			let wave = shockwaveArray[i]
			if (!star.hitWaves[wave.id]) {
				let dx = star.x - wave.x
				let dy = star.y - wave.y
				let dist = Math.sqrt(dx * dx + dy * dy)

				const MIN_BOUND = wave.lastRadius - 5
				const MAX_BOUND = wave.radius + 5

				if (dist >= MIN_BOUND && dist <= MAX_BOUND) {
					star.hitWaves[wave.id] = true
					explodeStar(star, wave)
					generateLightningChain(star, wave.waveColor)
					break
				}
			}
		}

		// 常规物理状态机切换树
		if (star.isExploding) {
			star.vx *= 0.96
			star.vy *= 0.96
			star.explodeTimer--

			if (star.radius > star.baseRadius) {
				star.radius -= 0.15
			}

			if (star.explodeTimer <= 0) {
				star.isExploding = false
				star.radius = star.baseRadius
			}
			star.x += star.vx
			star.y += star.vy
		} else if (star.isInOrbit) {
			if (Math.random() < (0.4 / PARTICLE_COUNT)) {
				resetStar(star)
				return
			}

			star.colorAngle = 45
			star.radius = star.baseRadius * 1.2
			star.orbitAngle += star.orbitSpeed

			let localX = Math.cos(star.orbitAngle) * star.orbitRadiusX
			let localY = Math.sin(star.orbitAngle) * star.orbitRadiusY

			let cosPlane = Math.cos(star.orbitPlaneAngle)
			let sinPlane = Math.sin(star.orbitPlaneAngle)
			let rotatedX = localX * cosPlane - localY * sinPlane
			let rotatedY = localX * sinPlane + localY * cosPlane

			star.x = orbitCenterX + rotatedX
			star.y = orbitCenterY + rotatedY
		} else {
			if (star.colorAngle !== star.baseColorAngle) {
				star.colorAngle += (star.baseColorAngle - star.colorAngle) * 0.05
			}
			star.radius = star.baseRadius

			let dx = mouseX - star.x
			let dy = mouseY - star.y
			let distanceSq = dx * dx + dy * dy
			let distance = Math.sqrt(distanceSq)

			if (distance < 15) {
				star.isInOrbit = true
				star.orbitAngle = Math.atan2(dy, dx)
			} else {
				let speedBoost = 1 + (300 / (distance + 20))
				let force = (BASE_GRAVITY * speedBoost) / (1 + distanceSq * 0.00005)

				star.vx += (dx / distance) * force
				star.vy += (dy / distance) * force
				star.vx *= FRICTION
				star.vy *= FRICTION

				star.x += star.vx
				star.y += star.vy
			}
		}

		// 视口安全溢出重置
		const BUFFER = 50
		if (star.x < -BUFFER || star.x > width + BUFFER || star.y < -BUFFER || star.y > height + BUFFER) {
			resetStar(star)
		} else {
			if (star.x < 0) {
				star.x = width
				if (star.vx < 0) star.vx *= -0.5
			}
			if (star.x > width) {
				star.x = 0
				if (star.vx > 0) star.vx *= -0.5
			}
			if (star.y < 0) {
				star.y = height
				if (star.vy < 0) star.vy *= -0.5
			}
			if (star.y > height) {
				star.y = 0
				if (star.vy > 0) star.vy *= -0.5
			}
		}
	}

	/**
	 * 绘制单个星体粒子
	 * @param {Object} star - 包含星星数据的对象
	 */
	const drawStar = (star) => {
		CTX.save()
		CTX.beginPath()
		CTX.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
		CTX.fillStyle = `hsla(${star.colorAngle}, 95%, 80%, ${star.alpha})`
		CTX.fill()
		CTX.restore()
	}

	/**
	 * 重绘带有鼠标追随星云的光晕背景层
	 */
	const drawBackground = () => {
		CTX.save()

		CTX.globalCompositeOperation = "source-over"
		CTX.fillStyle = "rgb(2, 1, 5)"
		CTX.fillRect(0, 0, width, height)

		CTX.fillStyle = "rgba(2, 1, 5, 0.85)"
		CTX.fillRect(0, 0, width, height)

		if (Number.isFinite(orbitCenterX) && Number.isFinite(orbitCenterY)) {
			let nebulaGlow = CTX.createRadialGradient(orbitCenterX, orbitCenterY, 5, orbitCenterX, orbitCenterY, 250)
			nebulaGlow.addColorStop(0, "rgba(40, 20, 100, 0.25)")
			nebulaGlow.addColorStop(0.6, "rgba(10, 5, 30, 0.08)")
			nebulaGlow.addColorStop(1, "rgba(0, 0, 0, 0)")
			CTX.fillStyle = nebulaGlow
			CTX.fillRect(0, 0, width, height)
		}

		CTX.restore()
	}

	// 初始化粒子群
	for (let i = 0; i < PARTICLE_COUNT; i++) {
		STARS_ARRAY.push(createStar())
	}

	// 用于取消动画帧的句柄
	let animationFrameId = null

	/**
	 * 高帧率主驱动图形循环
	 */
	const loop = () => {
		orbitCenterX += (mouseX - orbitCenterX) * ORBIT_EASING
		orbitCenterY += (mouseY - orbitCenterY) * ORBIT_EASING

		drawBackground()
		handleShockwave()

		// 调度三大宏观星演特效
		handleLightningChains()
		handleMeteors()
		handleSupernovaCore()

		// 自适应粒子池防干涸补给
		while (STARS_ARRAY.length < PARTICLE_COUNT) {
			STARS_ARRAY.push(createStar())
		}

		STARS_ARRAY.forEach(star => {
			updateStar(star)
			drawStar(star)
		})
		animationFrameId = requestAnimationFrame(loop)
	}

	/**
	 * 处理鼠标移动事件
	 * @param {MouseEvent} e - 鼠标移动对象
	 */
	const handleMouseMove = (e) => {
		const RECT = containerElement.getBoundingClientRect()
		mouseX = e.clientX - RECT.left
		mouseY = e.clientY - RECT.top
	}

	/**
	 * 处理鼠标点击事件
	 * @param {MouseEvent} e - 鼠标点击对象
	 */
	const handleMouseDown = (e) => {
		const RECT = containerElement.getBoundingClientRect()
		mouseX = e.clientX - RECT.left
		mouseY = e.clientY - RECT.top
		isMouseDown = true

		if (chargeTimeoutId) {
			clearTimeout(chargeTimeoutId)
		}

		// 只有当前没有激活超新星时, 才开启 1 秒长按判定机制
		if (!supernovaState.active) {
			chargeTimeoutId = setTimeout(() => {
				// 1秒后仍未松开, 正式确认为长按蓄力阶段
				supernovaState.active = true
				supernovaState.phase = "charge"
				supernovaState.chargeProgress = 0
				supernovaState.x = orbitCenterX
				supernovaState.y = orbitCenterY
				chargeTimeoutId = null
			}, 1000)
		}
	}

	const handleMouseUp = () => {
		isMouseDown = false
		// 如果 chargeTimeoutId 存在, 说明按下时间不足 1 秒
		if (chargeTimeoutId) {
			clearTimeout(chargeTimeoutId)
			chargeTimeoutId = null
			// 单击直接释放一个常规高能扩散激波
			if (shockwaveArray.length < MAX_SHOCKWAVE) {
				shockwaveArray.push(createShockwave(orbitCenterX, orbitCenterY))
			}
			return
		}
		// 如果已经进入了超新星长按蓄力阶段, 松开则触发大爆炸
		if (supernovaState.active && supernovaState.phase === "charge") {
			triggerSupernovaExplosion()
			// 并在爆炸中心追加一个冲击波
			if (shockwaveArray.length < MAX_SHOCKWAVE) {
				shockwaveArray.push(createShockwave(supernovaState.x, supernovaState.y))
			}
		}
	}

	/**
	 * 处理窗口调整大小事件
	 */
	const handleResize = () => {
		width = CANVAS.width = containerElement.clientWidth
		height = CANVAS.height = containerElement.clientHeight
	}

	// 绑定事件到容器元素上
	containerElement.addEventListener("mousemove", handleMouseMove)
	containerElement.addEventListener("mousedown", handleMouseDown)
	containerElement.addEventListener("mouseup", handleMouseUp)
	window.addEventListener("resize", handleResize)

	// 启动动画引擎
	loop()

	// 返回一个销毁钩子
	return {
		destroy: () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId)
			}
			if (chargeTimeoutId) {
				clearTimeout(chargeTimeoutId)
			}
			containerElement.removeEventListener("mousemove", handleMouseMove)
			containerElement.removeEventListener("mousedown", handleMouseDown)
			window.removeEventListener("mouseup", handleMouseUp)
			window.removeEventListener("resize", handleResize)
			if (CANVAS.parentNode) {
				CANVAS.parentNode.removeChild(CANVAS)
			}
		}
	}
}
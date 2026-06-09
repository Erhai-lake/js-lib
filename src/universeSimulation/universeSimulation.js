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
 *
 * 作者: Erhai-lake
 * 版本: 1.1.2
 * 日期: 2026-06-07
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
	waveSpeed: 10
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

	let width = CANVAS.width = containerElement.clientWidth
	let height = CANVAS.height = containerElement.clientHeight
	let mouseX = width / 2
	let mouseY = height / 2
	let orbitCenterX = width / 2
	let orbitCenterY = height / 2
	let waveIdCounter = 0
	let shockwaveArray = []
	const STARS_ARRAY = []

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
	 * 重置单颗星星指标
	 * @param {Object} star - 包含星星数据的对象
	 */
	const resetStar = (star) => {
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
		if (!star.isExploding) {
			star.alpha += star.blinkSpeed
			if (star.alpha > 1 || star.alpha < 0.2) {
				star.blinkSpeed = -star.blinkSpeed
			}
		}

		// 遇到了一个崭新的激波, 能触发二次轰击与轨迹修正
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
					// 触发连击冲击响应
					explodeStar(star, wave)
					break
				}
			}
		}

		if (star.isExploding) {
			star.vx *= 0.96
			star.vy *= 0.96
			star.explodeTimer--

			if (star.radius > star.baseRadius) star.radius -= 0.15

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

		// 如果超出边界过远, 直接就地重置粒子到屏幕内的随机位置, 实现无缝死而复生
		const BUFFER = 50
		if (star.x < -BUFFER || star.x > width + BUFFER || star.y < -BUFFER || star.y > height + BUFFER) {
			resetStar(star)
		} else {
			// 正常的视口穿梭包裹逻辑
			if (star.x < 0) star.x = width
			if (star.x > width) star.x = 0
			if (star.y < 0) star.y = height
			if (star.y > height) star.y = 0
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
	 * 引力超载拦截
	 * @param {Object} star - 包含星星数据的对象
	 */
	const implodeStar = (star) => {
		if (star.isInOrbit) {
			star.orbitPlaneAngle = Math.random() * Math.PI
			star.orbitSpeed = (Math.random() > 0.5 ? 1 : -1) * (0.1 + Math.random() * 0.15)
		} else {
			let dx = mouseX - star.x
			let dy = mouseY - star.y
			let distance = Math.sqrt(dx * dx + dy * dy)
			if (distance < 80) {
				resetStar(star)
			}
		}
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

		if (shockwaveArray.length < MAX_SHOCKWAVE) {
			shockwaveArray.push(createShockwave(mouseX, mouseY))
		} else {
			STARS_ARRAY.forEach(star => {
				implodeStar(star)
			})
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
	window.addEventListener("resize", handleResize)

	// 启动动画引擎
	loop()

	// 返回一个销毁钩子
	return {
		destroy: () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId)
			}
			containerElement.removeEventListener("mousemove", handleMouseMove)
			containerElement.removeEventListener("mousedown", handleMouseDown)
			window.removeEventListener("resize", handleResize)
			if (CANVAS.parentNode) {
				CANVAS.parentNode.removeChild(CANVAS)
			}
		}
	}
}
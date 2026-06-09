# js-lib

一些自用的js库, 为了省事写的一些轻量级的工具库, 他会出现在我的各种项目里.

等哪次用的时候, 觉得缺少什么功能, 或者出现了BUG, 就会更新对应的库了.

如果你也觉得好用, 喜欢用, 那就太好了, 很荣幸帮助到你.

如果你有什么建议, 或者问题, 都欢迎提issue或者pull request.

## 库列表

- **indexDB.js**: 一个基于 IndexedDB 的声明式/多物理表轻量级存储库, 仿 DexieJS 设计.
- **storageDB.js**: 一个基于 localStorage / sessionStorage 的轻量级数据库, 支持路径访问、TTL、响应式订阅等功能.
- **universeSimulation.js**: 一个高性能的宇宙电子轨道与多重激波模拟系统, 用于创建可交互的粒子背景效果.

## 开发指南(怕自己忘记)

### 项目结构

```
js-lib/
├── src/                    # 源代码目录
├── dist/                   # 构建产物 (自动生成, 无需手动修改)
├── package.json
├── rollup.config.js        # Rollup 构建配置
├── tsconfig.types.json     # TypeScript 类型生成配置
└── .github/workflows/
    └── build.yml           # GitHub Actions 工作流
```

### 添加新库

1. 在 `src/` 目录下创建新的文件夹, 例如 `src/myNewLib/`
2. 在新文件夹中创建主文件, 例如 `src/myNewLib/myNewLib.js`
3. 在 `rollup.config.js` 中添加新的构建配置:

```javascript
{
  input: "src/myNewLib/myNewLib.js",
  output: [
    {
      file: "dist/myNewLib/myNewLib.esm.js",
      format: "es",
      sourcemap: false
    },
    {
      file: "dist/myNewLib/myNewLib.cjs",
      format: "cjs",
      sourcemap: false,
      exports: "named"
    },
    {
      file: "dist/myNewLib/myNewLib.umd.js",
      format: "umd",
      name: "MyNewLib",
      sourcemap: false,
      exports: "named"
    }
  ],
  plugins: plugins
}
```

4. 在 `package.json` 的 `exports` 字段中添加新的导出路径:

```json
{
  "./myNewLib": {
    "import": "./dist/myNewLib/myNewLib.esm.js",
    "require": "./dist/myNewLib/myNewLib.cjs",
    "types": "./dist/myNewLib/myNewLib.d.ts"
  }
}
```

5. 在 `tsconfig.types.json` 的 `include` 字段中添加新文件:

```json
"include": [
  "src/indexDB/indexDB.js",
  "src/storageDB/storageDB.js",
  "src/universeSimulation/universeSimulation.js",
  "src/myNewLib/myNewLib.js"
]
```

### 更新库并重新编译

```bash
# 安装依赖 (首次或依赖变更时)
npm install

# 执行构建
npm run build

# 开发时监听模式 (自动重新编译)
npm run build:watch
```

### 构建产物

执行 `npm run build` 后, 每个库会生成以下文件:

```
dist/
└── myNewLib/
    ├── myNewLib.esm.js    # ESM 格式
    ├── myNewLib.cjs       # CommonJS 格式
    ├── myNewLib.umd.js    # UMD 格式 (可在浏览器直接使用)
    └── myNewLib.d.ts      # TypeScript 类型定义
```

## 许可证

MIT

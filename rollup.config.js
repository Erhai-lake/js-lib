import {defineConfig} from "rollup"
import terser from "@rollup/plugin-terser"

const plugins = [
	terser()
]

export default defineConfig([
	{
		input: "src/indexDB/indexDB.js",
		output: [
			{
				file: "dist/indexDB/indexDB.esm.js",
				format: "es",
				sourcemap: false
			},
			{
				file: "dist/indexDB/indexDB.cjs",
				format: "cjs",
				sourcemap: false,
				exports: "named"
			},
			{
				file: "dist/indexDB/indexDB.umd.js",
				format: "umd",
				name: "IndexDB",
				sourcemap: false,
				exports: "named"
			}
		],
		plugins: plugins
	},
	{
		input: "src/storageDB/storageDB.js",
		output: [
			{
				file: "dist/storageDB/storageDB.esm.js",
				format: "es",
				sourcemap: false
			},
			{
				file: "dist/storageDB/storageDB.cjs",
				format: "cjs",
				sourcemap: false,
				exports: "named"
			},
			{
				file: "dist/storageDB/storageDB.umd.js",
				format: "umd",
				name: "StorageDB",
				sourcemap: false,
				exports: "named"
			}
		],
		plugins: plugins
	},
	{
		input: "src/universeSimulation/universeSimulation.js",
		output: [
			{
				file: "dist/universeSimulation/universeSimulation.esm.js",
				format: "es",
				sourcemap: false
			},
			{
				file: "dist/universeSimulation/universeSimulation.cjs",
				format: "cjs",
				sourcemap: false,
				exports: "named"
			},
			{
				file: "dist/universeSimulation/universeSimulation.umd.js",
				format: "umd",
				name: "UniverseSimulation",
				sourcemap: false,
				exports: "named"
			}
		],
		plugins: plugins
	}
])

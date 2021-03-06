import babel from "@rollup/plugin-babel";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import resolve from "@rollup/plugin-node-resolve";

import analyzer from "rollup-plugin-analyzer";
import {terser} from "rollup-plugin-terser";
import visualizer from "rollup-plugin-visualizer";

const getOptionalPlugins = () => {
    if (process.env.NODE_ENV === "CI") {
        // We don't need any of these when running on CI.
        return [];
    }

    return [
        // NOTE: The analysis is of the pre-minified output.
        // So the reported bundle size is the non-minified size that includes
        // comments and full code.
        analyzer({summaryOnly: true, filter: (module) => module.size !== 0}),
        visualizer({
            title: "checksync bundle rollup (unminified)",
            filename: "report/stats.html",
        }),
    ];
};

export default {
    input: "./src/cli.js",
    output: {
        file: "./dist/cli.js",
        format: "cjs",
    },
    plugins: [
        json(),
        resolve({preferBuiltins: true}),
        babel({
            babelHelpers: "bundled",
            exclude: "node_modules/**", // only transpile our source code
        }),
        commonjs({
            sourceMap: false,
        }),
        terser(),
        ...getOptionalPlugins(),
    ],
};

// @flow
import getLaunchString from "./get-launch-string.js";
import cwdRelativePath from "./cwd-relative-path.js";
import ErrorCodes from "./error-codes.js";
import Format from "./format.js";
import validateAndFix from "./validate-and-fix.js";
import validateAndReport from "./validate-and-report.js";

import defaultArgs from "./default-args.js";

import type {ErrorCode} from "./error-codes.js";
import type {MarkerCache, ILog, Options} from "./types";

export default async function processCache(
    options: Options,
    cache: $ReadOnly<MarkerCache>,
    log: ILog,
): Promise<ErrorCode> {
    const {autoFix} = options;
    const violationFileNames: Array<string> = [];
    const fileValidator = autoFix ? validateAndFix : validateAndReport;
    for (const file of Object.keys(cache)) {
        try {
            if (!(await fileValidator(options, file, cache, log))) {
                violationFileNames.push(file);
            }
        } catch (e) {
            log.error(
                `${Format.cwdFilePath(
                    cwdRelativePath(file),
                )} update encountered error: ${e.message}`,
            );
        }
    }

    if (violationFileNames.length > 0) {
        const outputRerunCommand = () => {
            log.log("");
            /**
             * There are some arguments we need to include to ensure that the launch
             * string we output would work.
             *
             * We don't care about ignore files, because we're giving a list of specific
             * files, but we do care about:
             *  - comment matchers
             *  - the root marker
             */
            const updateCommandParts = [];
            updateCommandParts.push(getLaunchString());
            const commentsArg = options.comments.sort().join(",");
            if (commentsArg !== defaultArgs.comments) {
                updateCommandParts.push("-c");
                updateCommandParts.push(`"${commentsArg}"`);
            }
            const rootMarker = options.rootMarker;
            if (rootMarker != null) {
                updateCommandParts.push("-m");
                updateCommandParts.push(`"${rootMarker}"`);
            }
            updateCommandParts.push("-u");
            updateCommandParts.push(
                violationFileNames.map(cwdRelativePath).join(" "),
            );

            log.log(updateCommandParts.join(" "));
        };

        if (autoFix) {
            if (options.dryRun) {
                log.group(
                    `${violationFileNames.length} file(s) would have been fixed. To fix, run:`,
                );
                outputRerunCommand();
                log.groupEnd();
            } else {
                // Output a summary of what we fixed.
                log.info(`Fixed ${violationFileNames.length} file(s)`);
            }
        } else {
            // Output how to fix any violations we found if we're not running
            // autofix.
            log.log("");
            const errorMsg = log.errorsLogged
                ? "🛑  Desynchronized blocks detected and parsing errors found. Fix the errors, update the blocks, then update the sync-start tags using:"
                : "🛠  Desynchronized blocks detected. Check them and update as required before resynchronizing:";
            log.group(`${errorMsg}`);
            outputRerunCommand();
            log.groupEnd();
            return ErrorCodes.DESYNCHRONIZED_BLOCKS;
        }
    }

    if (log.errorsLogged) {
        log.log("🛑  Errors occurred during processing");
        return ErrorCodes.PARSE_ERRORS;
    }

    log.log("🎉  Everything is in sync!");
    return ErrorCodes.SUCCESS;
}

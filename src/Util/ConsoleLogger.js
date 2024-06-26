import { Readable } from "node:stream";
import chalk from "kleur";
import debugUtil from "debug";

const debug = debugUtil("Eleventy:Logger");

/**
 * Logger implementation that logs to STDOUT.
 * @ignore
 */
class ConsoleLogger {
	constructor() {
		/** @private */
		this._isVerbose = true;
		/** @type {Readable} */
		this.outputStream = Readable();
	}

	get isVerbose() {
		return this._isVerbose;
	}

	set isVerbose(verbose) {
		this._isVerbose = !!verbose;
	}

	/** @returns {boolean} */
	get isChalkEnabled() {
		if (this._isChalkEnabled !== undefined) {
			return this._isChalkEnabled;
		}
		return true;
	}

	set isChalkEnabled(enabled) {
		this._isChalkEnabled = !!enabled;
	}

	overrideLogger(logger) {
		this._logger = logger;
	}

	/** @param {string} msg */
	log(msg) {
		this.message(msg);
	}

	/** @param {string} prefix */
	/** @param {string} message */
	/** @param {string} type */
	/** @param {string} color */
	/** @param {boolean} force */
	logWithOptions({ message, type, prefix, color, force }) {
		this.message(message, type, color, force, prefix);
	}

	/** @param {string} msg */
	forceLog(msg) {
		this.message(msg, undefined, undefined, true);
	}

	/** @param {string} msg */
	info(msg) {
		this.message(msg, "warn", "blue");
	}

	/** @param {string} msg */
	warn(msg) {
		this.message(msg, "warn", "yellow");
	}

	/** @param {string} msg */
	error(msg) {
		this.message(msg, "error", "red");
	}

	/** @param {string} msg */
	toStream(msg) {
		this.outputStream.push(msg);
	}

	closeStream() {
		this.outputStream.push(null);
		return this.outputStream;
	}

	/**
	 * Formats the message to log.
	 *
	 * @param {string} message - The raw message to log.
	 * @param {'log'|'warn'|'error'} [type='log'] - The error level to log.
	 * @param {boolean} [chalkColor=false] - Use coloured log output?
	 * @param {boolean} [forceToConsole=false] - Enforce a log on console instead of specified target.
	 */
	message(message, type = "log", chalkColor = false, forceToConsole = false, prefix = "[11ty]") {
		if (!forceToConsole && (!this.isVerbose || process.env.DEBUG)) {
			debug(message);
		} else if (this._logger !== false) {
			message = `${chalk.gray(prefix)} ${message.split("\n").join(`\n${chalk.gray(prefix)} `)}`;

			let logger = this._logger || console;
			if (chalkColor && this.isChalkEnabled) {
				logger[type](chalk[chalkColor](message));
			} else {
				logger[type](message);
			}
		}
	}
}

export default ConsoleLogger;

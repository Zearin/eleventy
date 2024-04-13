import { TemplatePath } from "@11ty/eleventy-utils";
import { DepGraph } from "dependency-graph";

import JavaScriptDependencies from "./Util/JavaScriptDependencies.js";
import eventBus from "./EventBus.js";

class EleventyWatchTargets {
	constructor() {
		this.targets = new Set();
		this.dependencies = new Set();
		this.newTargets = new Set();
		this._watchJavaScriptDependencies = true;
		this.isEsm = false;

		this.graph = new DepGraph();
	}

	set watchJavaScriptDependencies(watch) {
		this._watchJavaScriptDependencies = !!watch;
	}

	get watchJavaScriptDependencies() {
		return this._watchJavaScriptDependencies;
	}

	setProjectUsingEsm(isEsmProject) {
		this.isEsm = !!isEsmProject;
	}

	isJavaScriptDependency(path) {
		return this.dependencies.has(path);
	}

	reset() {
		this.newTargets = new Set();
	}

	isWatched(target) {
		return this.targets.has(target);
	}

	addToDependencyGraph(parent, deps) {
		if (!this.graph.hasNode(parent)) {
			this.graph.addNode(parent);
		}
		for (let dep of deps) {
			if (!this.graph.hasNode(dep)) {
				this.graph.addNode(dep);
			}
			this.graph.addDependency(parent, dep);
		}
	}

	uses(parent, dep) {
		return this.getDependenciesOf(parent).includes(dep);
	}

	getDependenciesOf(parent) {
		if (!this.graph.hasNode(parent)) {
			return [];
		}
		return this.graph.dependenciesOf(parent);
	}

	getDependantsOf(child) {
		if (!this.graph.hasNode(child)) {
			return [];
		}
		return this.graph.dependantsOf(child);
	}

	addRaw(targets, isDependency) {
		for (let target of targets) {
			let path = TemplatePath.addLeadingDotSlash(target);
			if (!this.isWatched(path)) {
				this.newTargets.add(path);
			}

			this.targets.add(path);

			if (isDependency) {
				this.dependencies.add(path);
			}
		}
	}

	static normalize(targets) {
		if (!targets) {
			return [];
		} else if (Array.isArray(targets)) {
			return targets;
		}

		return [targets];
	}

	// add only a target
	add(targets) {
		this.addRaw(EleventyWatchTargets.normalize(targets));
	}

	static normalizeToGlobs(targets) {
		return EleventyWatchTargets.normalize(targets).map((entry) =>
			TemplatePath.convertToRecursiveGlobSync(entry),
		);
	}

	addAndMakeGlob(targets) {
		this.addRaw(EleventyWatchTargets.normalizeToGlobs(targets));
	}

	// add only a target’s dependencies
	async addDependencies(targets, filterCallback) {
		if (!this.watchJavaScriptDependencies) {
			return;
		}

		targets = EleventyWatchTargets.normalize(targets);
		let deps = await JavaScriptDependencies.getDependencies(targets, this.isEsm);
		if (filterCallback) {
			deps = deps.filter(filterCallback);
		}

		for (let target of targets) {
			this.addToDependencyGraph(target, deps);
		}
		this.addRaw(deps, true);
	}

	setWriter(templateWriter) {
		this.writer = templateWriter;
	}

	clearImportCacheFor(filePathArray) {
		let paths = new Set([
			...filePathArray,

			//	Imports changed the file
			//	(Delete from require cache so that updates to the module are re-required)
			...filePathArray.map((filePath) => this.getDependantsOf(filePath)),

			//	Imported in the changed file
			...filePathArray.map((filePath) => this.getDependenciesOf(filePath)),
		]);

		eventBus.emit("eleventy.importCacheReset", paths);
	}

	getNewTargetsSinceLastReset() {
		return Array.from(this.newTargets);
	}

	getTargets() {
		return Array.from(this.targets);
	}
}

export default EleventyWatchTargets;

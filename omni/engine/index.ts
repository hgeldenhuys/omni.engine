/* Copyright (C) AgileWorks, Inc - All Rights Reserved
 * License: AgileWorks Community License
 * Url: https://www.agileworks.co.za/agileworks-community-license
 */

/*
* Helper Functions
* */

import {
    assert,
    assertValueForPath,
    findUsedBomVariablesInCode,
    getPath,
    getValueForPath
} from "omni.models/utils";
import Version from "omni.models/model/version";
import Aggregate from "omni.models/model/aggregate";
import {RuleBehaviour} from "omni.interfaces/types";
import { RuleStructureInterface } from "omni.interfaces";
const uuidv4 = require('uuid/v4');

const registry: {[name: string]: {[version: string]: RulesEngine}} = {};

export function load(name: string, version: Version, rules: RuleInstance[], schemaVersion: string): RulesEngine {
    assert(
        name !== void 0,
        `Missing rules engine name`,
        "RE-001");
    assert(
        version !== void 0,
        `Missing rules engine version`,
        "RE-002");
    if ((registry[name] !== void 0) && (registry[name][version.toString()])) {
        return registry[name][version.toString()];
    }
    if (registry[name] === void 0) {
        registry[name] = {};
    }
    if (registry[name][version.toString()] === void 0) {
        assert(
            rules !== void 0,
            `Missing rules for engine ${name}`,
            "RE-003");
        registry[name][version.toString()] = new RulesEngine(rules, {}, name, version.toString(), schemaVersion);
    }
    return registry[name][version.toString()];
}

export function getEngine(name: string, version: string): RulesEngine {
    assert(
        name !== void 0,
        `Missing rules engine name`,
        "RE-001");
    assert(
        version !== void 0,
        `Missing rules engine version`,
        "RE-002");
    assert(
        registry[name] !== void 0,
        `No engine loaded with name ${name}`,
        "RE-004");
    assert(
        registry[name][version] !== void 0,
        `Version ${version} not loaded for ${name}`,
        "RE-005");
    return registry[name][version];
}

export const engines = {
    load,
    loadDecisionObject(ds: Aggregate) {
        load(ds.name || "unnamed", ds.version || {major: 1, minor: 0, patch: 0}, ds.getRules() as RuleInstance[], ds.schemaVersion());
    },
    getEngine
};

function censor(censor: any) {
    let i = 0;
    return (key: string, value: any) => {
        if (i !== 0 && typeof(censor) === "object" && typeof(value) === "object" && censor === value) {
            return "[Circular]";
        }
        if (i >= 100) { // seems to be a harded maximum of 30 serialized objects?
            return typeof value === "function" ? undefined : `${typeof value}`;
        }
        ++i; // so we know we aren't using the original object anymore
        return value;
    };
}
export const jlog = (obj: any) => {
    console.error(JSON.stringify(obj, censor(obj), 2));
};


/*
* The GoodStuff
* */

function addValueToJsonPath(json: any, path: string, defaultValue: any, rootName?: string) {
    if (path === "ApplicantEmailValidation[]") {
        console.log(JSON.stringify(json), path);
    }
    const root = json;
    path = path.replace(/\[\]/g, ".?");
    const paths = rootName ? getPath(`${rootName}.${path}`) : getPath(`${path}`);
    let parentNode: any = {};
    let child = "";
    paths.forEach((path) => {
        if (path !== "?") {
            parentNode = json;
            try {
                if (json[path] === undefined) {
                    json[path] = {};
                }
            } catch (e) {
                console.error(`Failed to add path in ${paths}: ${JSON.stringify(root, undefined, 2)}`);
                throw e;
            }
            json = json[path];
            child = path;
        } else {
            if (parentNode[child][0] === undefined) {
                parentNode[child] = [];
            }
            json = parentNode[child];
            parentNode = json;
            child = json.length;
        }
    });
    if (defaultValue !== undefined) {
        if (Array.isArray(parentNode) && (parentNode.indexOf(defaultValue) === -1)) {
            parentNode.push(defaultValue);
        } else if (!Array.isArray(parentNode)) {
            parentNode[child] = defaultValue;
        }

        if (child === "?") {
            parentNode[child] = undefined;
        }
    }
    else {
        delete parentNode[child];
    }
    return root;
}

export class RuleInstance {
    public variables: string[] = [];
    public usedVariables: string[] = [];
    public valid = false;
    public usedValues: {[key: string]: any} = {};
    public path: {[key: string]: string[]} = {};
    public enumerations?: string[];
    public id: string = uuidv4();
    public execute(rule: RuleInstance, engine: RulesEngine): RuleInstance | undefined {
        if (rule.behaviour === "Never")  {
            this.execute = (rule: RuleInstance, engine: RulesEngine): RuleInstance | undefined => {return undefined; };
        } else {
            let result;
            const theResultIs = (value: any) => {
                if (rule.enumerations && (value !== undefined)) {
                    assert(
                        rule.enumerations.indexOf(value) > -1,
                        `Invalid value for enumeration on ${rule.name}}`,
                        "ENUM-01");
                }
                result = value;
                return value;
            };
            result = theResultIs(undefined);
            // Inject some fancy stuff
            const space = " ", commaSpace = ", ", comma = ",";
            const fs =
                // OLD FN `fn=function(o,r){try{let bom=r.bomRoot;${this.code};if(result===undefined){return;}let e=r.bomRoot,n=r.bomRoot,s=o.name;o.name.split(".").forEach(function(o){e[o]===undefined?(e[o]={}):e[o],n=e,s=o,e=e[o]}),n[s]=result}catch(e){console.error("Error in "+o.name+"; Valid="+o.valid+"; Error:"+e.message+" "+e.stack+"}"),console.error("     "+o.usedVariables+": "+JSON.stringify(o.usedValues)),console.error("     "+JSON.stringify(r.bomRoot)),console.error("     Code: "+o.code),r.bomRoot.error=e}return o};`;
                `fn=function(rule,r){try{let bom=r.bomRoot;${this.code};if(result===undefined){return;}let e=r.bomRoot,n=r.bomRoot,s=rule.name;addValueToJsonPath(e, 'bom.'+s, result)}catch(e){console.error("Error in "+rule.name+"; Valid="+rule.valid+"; Error:"+e.message+" "+e.stack+"}"),console.error("     "+rule.usedVariables+": "+JSON.stringify(rule.usedValues)),console.error("     "+JSON.stringify(r.bomRoot)),console.error("     Code: "+rule.code),r.bomRoot.error=e}return rule};`;
            let fn;
            fn = (rule: RuleInstance, engine: RulesEngine): RuleInstance | undefined => {
                return undefined;
            };
            eval(fs);
            this.execute = fn;
            fn(this, engine);
            return result;
        }
    }
    public constructor(public name: string, public code: string, public bom: {}, enumerations?: string[], public behaviour?: RuleBehaviour, public ruleCode?: string) {
        this.behaviour = behaviour || "Normal";
        this.code = code;
        this.variables = findUsedBomVariablesInCode(code, "bom");
        this.variables.forEach((variable: string) => {
            this.path[variable] = getPath(variable);
        });
        this.enumerations = enumerations;
    }
    public calculate(): RuleInstance {
        this.valid = this.valid || (this.variables.length === 0);
        if (!this.valid || (this.behaviour === "Always")) {
            this.usedVariables = [];
            this.variables.forEach((variable: string) => {
                this.usedValues[variable] = getValueForPath(this.bom, this.path[variable]);
                if (this.usedValues[variable] !== undefined) {
                    this.usedVariables.push(variable);
                }
            });
            this.valid = (this.variables.length === this.usedVariables.length) || ((this.behaviour === "Some") && (this.variables.length > 0)) || (this.behaviour === "Always");
        }
        return this;
    }
}

export interface IRunConfiguration {
    withStats?: boolean;
}

export class RulesEngine {
    public usedRules: RuleInstance[] = [];
    public usedRuleNames: string[] = [];
    public usedRuleIds: string[] = [];
    public iterations = 0;
    public maxIterations = 100;
    public rules: RuleInstance[] = [];
    constructor(
        public inputRules: RuleStructureInterface[],
        public bomRoot: any,
        public name?: string,
        public version?: string,
        public schemaVersion?: string,
        public validateInputs: string[] = []) {

        this.runInputValidation();

        inputRules.forEach((rule) => {
            this.rules.push(new RuleInstance(rule.name, rule.code, bomRoot, rule.enumerations, rule.behaviour, rule.ruleCode));
        });
        this.calculate();
    }
    public runInputValidation() {
        this.validateInputs.forEach((inputRule) => {
            if (assertValueForPath(this.bomRoot, getPath(`bom.${inputRule}`), undefined)) {
                eval(`throw new Error('Input "${inputRule}" is missing a value inside "${this.name}": ${JSON.stringify(this.bomRoot)}')`);
            }
        });
    }
    public withBom(bom: any) {
        this.bomRoot = bom;
        this.usedRules = [];
        this.usedRuleNames = [];
        this.usedRuleIds = [];
        this.rules.forEach((rule) => {
            rule.valid = false;
            rule.bom = bom;
            if ((rule.valid !== rule.calculate().valid) && (rule.valid)) {
                if (this.usedRuleIds.indexOf(rule.id) === -1) {
                    this.usedRuleIds.push(rule.id);
                    this.usedRules.push(rule);
                    this.usedRuleNames.push(rule.name);
                }
            }
        });
        return this;
    }
    public calculate() {
        this.rules.forEach((rule) => {
            if ((rule.valid !== rule.calculate().valid) && (rule.valid)) {
                if (this.usedRuleIds.indexOf(rule.id) === -1) {
                    this.usedRules.push(rule);
                    this.usedRuleNames.push(rule.name);
                    this.usedRuleIds.push(rule.id);
                }
            }
        });
        return this;
    }
    public run(configuration?: IRunConfiguration) {
        this.iterations = 0;
        const start = new Date();
        let previousUsedRuleNames = "";
        let usedRuleNames = this.usedRuleNames.toString();
        while (previousUsedRuleNames !== usedRuleNames) {
            if (this.iterations >= this.maxIterations) {
                throw new Error(`Max iterations of ${this.maxIterations} reached.`);
            }
            this.iterations ++;
            this.usedRules.forEach((rule) => {
                try {
                    rule.execute(rule, this);
                } catch (e) {
                    console.error(rule.name + " " +  e + " " + e.stack);
                    this.bomRoot[rule.name] = undefined;
                    this.bomRoot.error = rule.name + " threw an error: " + e.toString();
                }
            });
            // What actually ran
            this.calculate();
            previousUsedRuleNames = usedRuleNames;
            usedRuleNames = this.usedRuleNames.toString();
        }
        if (!!configuration && !!configuration.withStats) {
            const end = new Date();
            if (!this.bomRoot.engine) this.bomRoot.engine = {};
            const engine = {
                runtime: {version: this.version,
                    schema: this.schemaVersion,
                    executionTime: end.valueOf() - start.valueOf(),
                    runIterations: this.iterations,
                    usedRuleNames: this.usedRuleNames,
                    unusedRules: this.rules.filter((rule) => {return !rule.valid; }).map((rule) => {return {name: rule.name, missing: rule.variables.filter((variable) => {return rule.usedVariables.indexOf(variable) === -1; })}; })},
                tableResults: {} as {[key: string]: any},
                conditions: this.bomRoot._conditions
            };
            this.bomRoot.engine[this.name || "default"] = engine;
            const processed: string[] = [];
            this.usedRuleNames.forEach((name, nameIndex) => {
                if ((name.indexOf("DecisionTable_") > -1) && (processed.indexOf(name) === -1)) {
                    processed.push(name);
                    const value = getValueForPath(this.bomRoot, getPath("bom." + name));
                    if (value) {
                        engine.tableResults[name] = value;
                    }
                }
            });
        }
        this.usedRuleNames.forEach((name, nameIndex) => {
            if ((name.indexOf("DecisionTable_") > -1)) {
                addValueToJsonPath(this.bomRoot, name, undefined, "bom");
            }
        });
        delete this.bomRoot._conditions;
        return this.bomRoot;
    }
}
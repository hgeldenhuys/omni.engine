import {expect} from "chai";
import {RulesEngine} from "../omni/engine";
import Aggregate from "omni.models/model/aggregate";

describe(`Check Schema MD5 Version`, () => {
    it(`should return a valid MD5 hex`, () => {
        const decisionObject = new Aggregate(undefined, {
            name: "Rules",
            version: {major: 1, minor: 0, patch: 0},
            decisionObjectType: "RuleSet",
            facts: [
                {
                    dataType: "string",
                    rule: {
                        name: "FullName",
                        statedAs: `FirstName + " " + LastName`
                    }
                }
            ]
        });
        expect(decisionObject.schemaVersion().toString())
            .to
            .equal(`4335e36b8f49bc0d2b17e5cdc46821d6`);

        decisionObject.facts[0].path = "Changed";

        expect(decisionObject.schemaVersion().toString())
            .to
            .not
            .equal(`ce75249a4b0cddbc4a7ab8a3864b1314`);
    });
});

describe(`Implicit Facts`, () => {
    it(`should be stated as expected and missing`, () => {
        const aggregate = new Aggregate(undefined, {
            name: "Rules",
            version: {major: 1, minor: 0, patch: 0},
            decisionObjectType: "RuleSet",
            facts: [
                {
                    dataType: "string",
                    rule: {
                        name: "FullName",
                        statedAs: `FirstName + " " + LastName`
                    }
                }
            ]
        });
        expect(JSON.stringify(aggregate.missingExpectedFacts()))
            .to
            .equal(`[{"name":"FirstName","expectedBy":["FullName"]},{"name":"LastName","expectedBy":["FullName"]}]`);
        if (aggregate.facts[0] && aggregate.facts[0].pathMapping) {
            aggregate.facts[0].pathMapping.push({
                replaceName: "FirstName",
                withPath: "firstname"
            });
        }
        expect(JSON.stringify(aggregate.missingExpectedFacts()))
            .to
            .equal(`[{"name":"firstname","expectedBy":["FullName"]},{"name":"LastName","expectedBy":["FullName"]}]`);
    });
});

describe(`Sample Json`, () => {
    it(`should be stated as expected and missing`, () => {
        const decisionObject = new Aggregate(undefined, {
            name: "Rules",
            version: {major: 1, minor: 0, patch: 0},
            decisionObjectType: "RuleSet",
            facts: [
                {
                    dataType: "string",
                    rule: {
                        name: "LastName",
                        sampleValue: "InAction"
                    }
                },
                {
                    dataType: "string",
                    path: "MiddleName"
                },
                {
                    dataType: "string",
                    rule: {
                        name: "FullName",
                        statedAs: `FirstName + " " + LastName`
                    },
                    pathMapping: [{
                        replaceName: "LastName",
                        withPath: "lastname"
                    }]
                }
            ]
        });

        const x = new Aggregate(undefined, {
            "id": 1001577399249,
            "name": "Birthday",
            "version": {major: 1, minor: 0, patch: 0},
            "facts": [
                {
                    "dataType": "string",
                    rule: {
                        "id": 1001808803078,
                        "name": "StringDate",
                        "description": "Takes date and outputs a string formatted date",
                        "statedAs": "theResultIs(new Date(DateTime).toLocaleString())",
                        "dataType": "string"
                    },
                    "pathMapping": [
                        {
                            "withPath": "Date",
                            "replaceName": "Date"
                        },
                        {
                            "withPath": "DateTime",
                            "replaceName": "DateTime"
                        }
                    ]
                },
                {
                    "dataType": "string",
                    "path": "DateTime",
                    "pathMapping": []
                }
            ],
            "description": "Birthday"
        });
        console.log(x.sampleJson());
        console.log(x.getRules());
        expect(decisionObject.sampleJson().FirstName)
            .to
            .equal(`missing`);
        expect(decisionObject.sampleJson().LastName)
            .to
            .equal(`InAction`);

        decisionObject.facts[0].path = "lastname";

        expect(decisionObject.sampleJson().lastname)
            .to
            .equal(`InAction`);
    });
});

describe(`Implicit Facts`, () => {
    it(`should be stated as expected and missing`, () => {
        const aggregate = new Aggregate(undefined, {
            name: "Rules",
            version: {major: 1, minor: 0, patch: 0},
            decisionObjectType: "RuleSet",
            facts: [
                {
                    dataType: "string",
                    rule: {
                        name: "FullName",
                        statedAs: `FirstName + space + LastName`
                    }
                }
            ]
        });
        const engine = new RulesEngine(
            aggregate.getRules(),
            {
                FirstName: "Uncle",
                LastName: "Bob"
            },
            "test",
            "1.0");
        const result = engine.run({withStats: false});
        expect(result.FullName).to.equal("Uncle Bob");
    });
});

describe(`Path Mapping from BOM`, () => {
    it(`should pick up facts from paths and save result in a path`, () => {
        let aggregate = new Aggregate(undefined, {
            name: "Rules",
            version:  {major: 2, minor: 0, patch: 0},
            decisionObjectType: "RuleSet",
            facts: [
                {
                    dataType: "string",
                    rule: {
                        name: "FullName",
                        statedAs: `FirstName + space + LastName`
                    },
                    pathMapping: [{
                        replaceName: "LastName",
                        withPath: "family.name"
                    }],
                    path: "results.fullname"
                },
                {
                    dataType: "string",
                    rule: {
                        name: "FullName2",
                        statedAs: `"My full name is: " + FullName`
                    },
                    pathMapping: [{
                        replaceName: "FullName",
                        withPath: "results.fullname"
                    }],
                    path: "results.fullname2"
                }
            ]
        });
        const engine = new RulesEngine(
            aggregate.getRules(),
            {
                FirstName: "Uncle",
                family: {
                    name: "Bob"
                }
            },
            "test",
            "2.0");
        const result = engine.run({withStats: true});

        expect(result.results.fullname).to.equal("Uncle Bob");
    });
});

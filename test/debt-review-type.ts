import {AggregateInterface} from "omni.interfaces";

export const debtReviewType: AggregateInterface = {
  name: "ApplicantEntryFormValidation",
  version: {"major": 1, "minor": 0, "patch": 0},
  facts: [
    {
      name: "DebtReviewType",
      enumerations: ["ApplicantOnly", "ApplicantAndSpouse"]
    },
    {
      path: "ValidationCodes",
      rules: [
          {
            name: "NoApplicantEmail",
            statedAs: "ApplicantEmail === null ? rule.ruleCode : undefined",
            behaviour: "Always"
          },
          {
            name: "BlankEmail",
            statedAs: "ApplicantEmail === '' ? rule.ruleCode : undefined"
          },
          {
            name: "SpouseEmailRequired",
            statedAs: "!SpouseEmail && DebtReviewType === 'ApplicantAndSpouse' ? rule.ruleCode : undefined"
          },
      ]
    },
    {
      rule: {
        name: "valid",
        statedAs: "ValidationCodes ? ValidationCodes.length === 0 : true",
          behaviour: "Always"
      }
    },
    {
      rule: {
        name: "ValidationMessages",
        statedAs: "valid ? '' : 'The following fields are required: \\n - ' + ApplicantEmailValidationCodes.join('\\n - ')"
      }
    }
  ]
};
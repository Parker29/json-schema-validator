const Ajv = require("ajv");
const request = require("request");
const logger = require("../winston");
const CustomAjvError = require("../model/custom-ajv-error");

const taxonomySearchUrl = "https://www.ebi.ac.uk/ena/taxonomy/rest/any-name";
const NoResults = "No results.";

class IsValidTaxonomy {
    constructor(keywordName) {
        this.keywordName = keywordName ? keywordName : "isValidTaxonomy";
    }

    configure(ajv) {
        const keywordDefinition = {
            async: this.isAsync(),
            type: "string",
            validate: this.generateKeywordFunction(),
            errors: true
        };

        return ajv.addKeyword(this.keywordName, keywordDefinition);
    }

    keywordFunction() {
        return this.generateKeywordFunction();
    }

    isAsync() {
        return true;
    }

    generateKeywordFunction() {
        const findTaxonomy = (schema, data) => {
            return new Promise((resolve, reject) => {
                if(schema) {
                    let errors = [];
            
                    const taxonomyExpression = data;
                    const encodedTaxonomyUri = encodeURIComponent(taxonomyExpression);
                    const url = [taxonomySearchUrl, encodedTaxonomyUri].join("/");
            
                    logger.log("debug", `Looking for taxonomy [${taxonomyExpression}] with ENA taxonomy validator.`);
                    request(url, (error, Response, body) => {
                        logger.log("debug", `Raw response: ${body}`);
                        if (body === NoResults) {
                            generateNotExistsErrorMessage();
                        } else {
                            let jsonBody = JSON.parse(body);
                
                            if (jsonBody) {
                                let numFound = jsonBody.length;
                
                                if (numFound === 1 && jsonBody[0]["taxId"] && jsonBody[0]["submittable"] == "true") {
                                logger.log("debug", "Found 1 match!");
                                resolve(true);
                                } else if (numFound === 0) {
                                    generateNotExistsErrorMessage()
                                } else {
                                errors.push(
                                    new CustomAjvError(
                                        "isValidTaxonomy", `Something went wrong while validating the given taxonomy expression [${taxonomyExpression}], try again.`,
                                        {keyword: "isValidTaxonomy"})
                                );
                                reject(new Ajv.ValidationError(errors));
                                }
                            } else {
                                generateNotExistsErrorMessage();
                            }
                        }
                        
                        function generateNotExistsErrorMessage() {
                            logger.log("debug", `Could not find the given taxonomy [${taxonomyExpression}].`);
                            errors.push(
                                new CustomAjvError(
                                    "isValidTaxonomy", `provided taxonomy expression does not exist: [${taxonomyExpression}]`, {keyword: "isValidTaxonomy"})
                            );
                            reject(new Ajv.ValidationError(errors));
                        }
                    });
                } else {
                  resolve(true);
                }
            });

        };

        return findTaxonomy;
    }
}

module.exports = IsValidTaxonomy;

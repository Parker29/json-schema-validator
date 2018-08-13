/**
 * Created by rolando on 02/08/2018.
 */
const config = require('config');
const R = require('rambda');

const DocumentUpdateListener = require('./listener/document-update-listener');
const DocumentUpdateHandler = require('./listener/handlers/document-update-handler');

const FileValidationListener = require('./listener/file-validation-listener');
const FileValidationHandler = require('./listener/handlers/file-validation-handler');

const IngestClient = require('./utils/ingest-client/ingest-client');
const IngestValidator = require('./validation/ingest-validator');
const IngestFileValidator = require('./utils/ingest-client/ingest-file-validator');

const schemaValidator = require('./validation/validator');


const ingestClient = (() => {
    const ingestConnectionConfig = config.get("INGEST_API.connection");
    return new IngestClient(ingestConnectionConfig);
})();

const ingestFileValidator = (() => {
    const fileValidationConnectionConfig = config.get("UPLOAD_API.connection");
    const apiKey = config.get("UPLOAD_API.apiKey");
    const validationImageConfigs = config.get("FILE_VALIDATION_IMAGES");
    const validationImages = R.map(config => new IngestFileValidator.FileValidationImage(config['fileFormat'], config['imageUrl']) (validationImageConfigs);

    return new IngestFileValidator(fileValidationConnectionConfig, apiKey, validationImages, ingestClient);
})();

const ingestValidator = (() => {
    return new IngestValidator(schemaValidator, ingestFileValidator, ingestClient);
})();

const documentUpdateListener = (() => {
    const handler = new DocumentUpdateHandler(ingestValidator, ingestClient);

    const rabbitConnectionConfig = config.get("AMQP.metadataValidation.connection");
    const rabbitMessagingConfig = config.get("AMQP.metadataValidation.messaging");

    const exchange = rabbitMessagingConfig["exchange"];
    const queue = rabbitMessagingConfig["queueName"];
    const exchangeType = rabbitConnectionConfig["exchangeType"];

    return new DocumentUpdateListener(rabbitConnectionConfig, exchange, queue, handler, exchangeType);
})();


const fileValidationListener = (() => {
    const handler = new FileValidationHandler(ingestClient);

    const rabbitConnectionConfig = config.get("AMQP.fileValidationResults.connection");
    const rabbitMessagingConfig = config.get("AMQP.fileValidationResults.messaging");


    const exchange = rabbitMessagingConfig["exchange"];
    const queue = rabbitMessagingConfig["queueName"];
    const exchangeType = rabbitConnectionConfig["exchangeType"];

    return new FileValidationListener(rabbitConnectionConfig, exchange, queue, handler, exchangeType);
})();


function begin() {
    documentUpdateListener.start();
    fileValidationListener.start();
}

begin();
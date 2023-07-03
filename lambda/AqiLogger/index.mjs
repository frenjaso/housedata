import { PutMetricDataCommand } from "@aws-sdk/client-cloudwatch"; // ES Modules import
import { PutItemCommand } from "@aws-sdk/client-dynamodb";
import {clients, dateUtils} from "@frenjaso/sensor-data-common"

const dansPiUUID = "de39fd6b-f3de-47d7-bc68-2ef8d9047c60";
const defaultDataType = "particulate"

export const handler = async(event) => {
    console.log("Event received: " + JSON.stringify(event));
    const eventBody = JSON.parse(event.body);
    console.log("payload body: " + JSON.stringify(eventBody));

    const date = new Date(eventBody.epochMillis);

    await writeToCloudWatch(eventBody, date);
    await writeDataToDdb(eventBody, date);

    const responseToClient = {
        statusCode: 200,
        eventBody: JSON.stringify({ Message: 'Success' }),
    };
    return responseToClient;
};

async function writeToCloudWatch(eventBody, date) {

    const deviceId = getDeviceId(eventBody);
    if (dansPiUUID !== deviceId) {
        return;
    }

    const client = clients.getCloudWatchClient();
    const input = {
        Namespace: "ParticulateTracker_v2",
        MetricData: [
            {
                MetricName: "ParticleData",
                Dimensions: [
                    {
                        Name: "ParticulateType",
                        Value: "pmt10",
                    },
                ],
                Timestamp: date,
                Values: [
                    Number(eventBody.pmt10),
                ],
                Unit: "None"
            },
            {
                MetricName: "ParticleData",
                Dimensions: [
                    {
                        Name: "ParticulateType",
                        Value: "pmt25",
                    },
                ],
                Timestamp: date,
                Values: [
                    Number(eventBody.pmt25),
                ],
                Unit: "None"
            },
        ],
    };
    const command = new PutMetricDataCommand(input);

    try {
        await client.send(command);
        console.log("Successfully wrote data to cloudwatch")
    } catch (error) {
        console.log("Error writing data to cloudwatch: " + error);
    }
}


async function writeDataToDdb(eventBody, date) {
    const client = clients.getDynamoDocumentClient();

    const currentDate = dateUtils.getUtcDateString(date);
    const currentTime = dateUtils.getUtcTimeString(date);
    
    console.log("Date: " + currentDate);
    console.log("Time: " + currentTime);
    
    const legacyItem = {
        TableName: "ParticulateData",
        Item: {
            date: { S: currentDate },
            time: { S: currentTime },
            pmt10: { N: `${eventBody.pmt10}` },
            pmt25: { N: `${eventBody.pmt25}` }
        },
    };

    const item = {
        TableName: "SensorData",
        Item: {
            hashKey: { S: getSensorDataHashKey(eventBody, date) },
            time: { S: currentTime },
            pmt10: { N: `${eventBody.pmt10}` },
            pmt25: { N: `${eventBody.pmt25}` }
        },
    };

    const command = new PutItemCommand(item);
    const legacyCommand = new PutItemCommand(legacyItem);

    const commands = [ client.send(command), client.send(legacyCommand) ]

    try {
        await Promise.all(commands);
        console.log("Items put successfully");
    } catch (error) {
        console.log("Error putting items: " + error);
    }
}

function getSensorDataHashKey(eventBody, date) {
    const dataType = eventBody.dataType != null ? eventBody.dataType : defaultDataType;
    const deviceId = getDeviceId(eventBody);
    const dateString = dateUtils.getUtcDateString(date);

    return `${dateString}-${deviceId}-${dataType}`;
}

function getDeviceId(eventBody) {
    return eventBody.deviceId != null ? eventBody.deviceId : dansPiUUID;
}
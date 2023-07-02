import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch"; // ES Modules import
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const region = "us-west-2"
const dansPiUUID = "de39fd6b-f3de-47d7-bc68-2ef8d9047c60";
const defaultDataType = "particulate"

export const handler = async(event) => {
    console.log("Event recieved: " + JSON.stringify(event));
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
    const client = new CloudWatchClient(getClientConfiguration());
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
    const response = await client.send(command);
}


async function writeDataToDdb(eventBody, date) {
    const client = new DynamoDBClient(getClientConfiguration());
    
    const currentDate = getDateString(date);
    const currentTime = getTimeString(date);
    
    console.log("Date: " + currentDate);
    console.log("Time: " + currentTime);
    
    const legacyItem = {
        TableName: "ParticulateData",
        Item: {
            // Specify the attributes of the item
            date: { S: currentDate },
            time: { S: currentTime },
            pmt10: { N: `${eventBody.pmt10}` },
            pmt25: { N: `${eventBody.pmt25}` }
        },
    };

    const item = {
        TableName: "SensorData",
        Item: {
            // Specify the attributes of the item
            hashKey: { S: getSensorDataHashKey(eventBody, date) },
            time: { S: currentTime },
            pmt10: { N: `${eventBody.pmt10}` },
            pmt25: { N: `${eventBody.pmt25}` }
        },
    };

    const command = new PutItemCommand(item);
    const legacyCommand = new PutItemCommand(legacyItem);

    // Create a `PutItemCommand` with the item and execute it
    // const command = new PutItemCommand(item);
    const commands = [ client.send(command), client.send(legacyCommand) ]

    try {
        const responses = await Promise.all(commands);
        console.log("Items put successfully");
    } catch (error) {
        console.log("Error putting items: " + error);
    }
}
    
function getTimeString(date) {
	let currentHour = String(date.getHours()).padStart(2, '0');
	let currentMinute = String(date.getMinutes()).padStart(2,"0");
	let currentSecond = String(date.getSeconds()).padStart(2,"0");

	let currentTime = `${currentHour}:${currentMinute}:${currentSecond}`;
	return currentTime;
}

function getDateString(date) {
	let currentDay= String(date.getDate()).padStart(2, '0');
	let currentMonth = String(date.getMonth()+1).padStart(2,"0");
	let currentYear = date.getFullYear();

	let currentDate = `${currentYear}-${currentMonth}-${currentDay}`;
	return currentDate;
}

function getClientConfiguration() {
    const isLambda = !!process.env.LAMBDA_TASK_ROOT;
    if (isLambda) {
        return {
            region: region
        }
    } else {
        console.log("Using hardcoded credentials");
        return {
            region: region,
            credentials: {
                accessKeyId: "AKIAYYHAN2OAUCUPS65P",
                secretAccessKey: "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"
            }
        }
    }
}

function getSensorDataHashKey(eventBody, date) {
    const dataType = eventBody.dataType != null ? eventBody.dataType : defaultDataType;
    const deviceId = eventBody.deviceId != null ? eventBody.deviceId : dansPiUUID;
    const dateString = getDateString(date);

    return `${dateString}-${deviceId}-${dataType}`;
}
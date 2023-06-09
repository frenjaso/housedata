import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch"; // ES Modules import
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

export const handler = async(event) => {
  console.log("Event received: " + event);
  const body = JSON.parse(event.body);
  console.log("payload body: " + body);
  
  const date = new Date();
  
  await writeToCloudWatch(body, date);
  await writeDataToDdb(body, date);
  
  const responseToClient = {
        statusCode: 200,
        body: JSON.stringify({ Message: 'Success' }),
    };
  return responseToClient;
};

async function writeToCloudWatch(eventBody, date) {
    const client = new CloudWatchClient({ region: "us-east-1" });
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
    const client = new DynamoDBClient({ "region": "us-east-1" });
    
    const currentDate = getDateString(date);
    const currentTime = getTimeString(date);
    
    console.log("Date: " + currentDate);
    console.log("Time: " + currentTime);
    
    const item = {
        TableName: "ParticulateData",
        Item: {
            // Specify the attributes of the item
            date: { S: currentDate },
            time: { S: currentTime },
            pmt10: { N: `${eventBody.pmt10}` },
            pmt25: { N: `${eventBody.pmt25}` }
        },
    };
    
    // Create a `PutItemCommand` with the item and execute it
    const command = new PutItemCommand(item);
    
    const response = await client.send(command)
        .then((response) => {
            console.log("Item put successfully:", response);
        })
        .catch((error) => {
            console.error("Error putting item:", error);
        });
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
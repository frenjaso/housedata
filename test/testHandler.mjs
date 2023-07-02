import event from './testEvent.mjs'
import { handler} from "../lambda/AqiLogger/index.mjs";


console.log("Hello World");


const response = handler(event);

console.log(response);
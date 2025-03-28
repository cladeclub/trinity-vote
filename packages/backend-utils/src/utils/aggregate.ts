const AGGREGATOR_URL = 'http://localhost:8001';

type Request = {
  data: Object;
  callback: Function;
};

let isProcessRunning = false;
let queue: Request[] = [];

async function process() {
  if (queue.length) {
    const { data, callback } = queue[0];
    queue = queue.slice(1);

    try {
      const response = await fetch(`${AGGREGATOR_URL}/prove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        callback('prove_request_failed');
        process();
        return;
      }

      const result = await response.json();

      if (!result.success) {
        callback(result.error || 'prove_request_failed');
        process();
        return;
      }

      callback(null, result.proof);
      process();
    } catch (error) {
      console.log(error);
      callback(error);
      process();
    }
  } else {
    isProcessRunning = false;
  }
};

export default (
  data: Object,
  callback: Function
) => {
  queue.push({ data, callback });

  if (!isProcessRunning)
    process();
};
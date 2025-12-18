// import from .env in the frontend root folder
//if you want to change the API_BASE_URL for backend ip address go to .env currently its using localhost:500 that its set in the express js baclkend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export default API_BASE_URL;

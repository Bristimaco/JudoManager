import axios from "axios";

export const api = axios.create({
    baseURL: "https://judomanager-9tm4j.ondigitalocean.app",
    withCredentials: true,
});

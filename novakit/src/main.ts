import { createApp } from "vue";
import App from "./App.vue";
import "./styles/main.css";
import { installDemoApi } from "./demo/mockApi";

installDemoApi();

createApp(App).mount("#app");

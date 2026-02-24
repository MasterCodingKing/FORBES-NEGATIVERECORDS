const app = require("./src/app");

const PORT = process.env.PORT || 3010;
const IP = process.env.IP || "192.168.34.86";

app.listen(PORT, IP, () => {
  console.log(`Server running on http://${IP}:${PORT}`);
});

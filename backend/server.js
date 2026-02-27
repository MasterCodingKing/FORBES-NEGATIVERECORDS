const app = require("./src/app");

const PORT = process.env.PORT || 3010;
const IP = process.env.IP || "0.0.0.0";

app.listen(PORT, IP, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Access from local network using: http://192.168.34.86:${PORT}`);
});

// Use strict
"use strict";


// Main function

// Set window's transport WebUSB
window["TransportWebUSB"] = require("@ledgerhq/hw-transport-webusb")["default"];

// Set window's Buffer
window["Buffer"] = require("buffer")["Buffer"];

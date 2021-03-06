// Use strict
"use strict";


// Classes

// Transport web Bluetooth
class TransportWebBluetooth {

	// Public
	
		// Constructor
		constructor(connection, writeCharacteristic, notifyCharacteristic, mtu) {
		
			// Set connection
			this.connection = connection;
			
			// Set write characteristic
			this.writeCharacteristic = writeCharacteristic;
			
			// Set notify characteristic
			this.notifyCharacteristic = notifyCharacteristic;
			
			// Set MTU
			this.mtu = mtu;
		
			// Set allow disconnect event to true
			this.allowDisconnectEvent = true;
		
			// Set device model
			this["deviceModel"] = {
			
				// Product name
				"productName": TransportWebBluetooth.PRODUCT_NAME
			};
		}
		
		// On
		on(event, callback) {
		
			// Check event
			switch(event) {
			
				// Disconnect
				case "disconnect":
				
					// Set self
					var self = this;
				
					// Create callback once
					var callbackOnce = function() {
					
						// Remove GATT server disconnected event
						self.connection["device"].removeEventListener("gattserverdisconnected", callbackOnce);
						
						// Check if disconnect event is allowed
						if(self.allowDisconnectEvent === true) {
						
							// Call callback
							callback();
						}
					};
				
					// Device GATT server disconnected event
					this.connection["device"].addEventListener("gattserverdisconnected", callbackOnce);
				
					// Break
					break;
			}
		}
		
		// Close
		close() {
		
			// Clear allow disconnect event
			this.allowDisconnectEvent = false;
			
			// Check if connection is connected
			if(this.connection["connected"] === true) {
		
				// Disconnect connection
				this.connection.disconnect();
			}
		
			// Return promise
			return new Promise(function(resolve, reject) {
			
				// Resolve
				resolve();
			});
		}
		
		// Send
		send(requestClass, requestInstruction, parameterOne, parameterTwo, data) {
		
			// Set self
			var self = this;
		
			// Return promise
			return new Promise(function(resolve, reject) {
			
				// Check if connection is connected
				if(self.connection["connected"] === true) {
				
					// Create header
					var header = new Uint8Array([requestClass, requestInstruction, parameterOne, parameterTwo, data["length"]]);
					
					// Create APDU
					var apdu = new Uint8Array(header["length"] + data["length"]);
					apdu.set(header);
					apdu.set(data, header["length"]);
			
					// Return getting APDU response from device
					return TransportWebBluetooth.sendRequest(self.connection, self.writeCharacteristic, self.notifyCharacteristic, TransportWebBluetooth.APDU_COMMAND_TAG, apdu, self.mtu).then(function(response) {
					
						// Check if connection is connected
						if(self.connection["connected"] === true) {
						
							// Check if response contains a status
							if(response["length"] >= TransportWebBluetooth.APDU_STATUS_LENGTH) {
							
								// Get status
								var status = response[response["length"] - 1] | (response[response["length"] - 2] << TransportWebBluetooth.BITS_IN_A_BYTE);
								
								// Check if status is success
								if(status === TransportWebBluetooth.APDU_SUCCESS_STATUS)  {
								
									// Resolve response
									resolve(response);
								}
								
								// Otherwise
								else {
								
									// Reject error
									reject({
									
										// Status code
										"statusCode": status
									});
								}
							}
							
							// Otherwise
							else {
							
								// Reject
								reject();
							}
						}
						
						// Otherwise
						else {
						
							// Reject error
							reject(new DOMException("", "NetworkError"));
						}
						
					// Catch errors
					}).catch(function(error) {
					
						// Check if connection is connected
						if(self.connection["connected"] === true) {
					
							// Reject error
							reject(error);
						}
						
						// Otherwise
						else {
						
							// Reject error
							reject(new DOMException("", "NetworkError"));
						}
					});
				}
				
				// Otherwise
				else {
				
					// Reject error
					reject(new DOMException("", "NetworkError"));
				}
			});
		}

		// Request
		static request(device = TransportWebBluetooth.NO_DEVICE) {
		
			// Return promise
			return new Promise(function(resolve, reject) {
			
				// Get device
				var getDevice = function() {
				
					// Return promise
					return new Promise(function(resolve, reject) {
					
						// Check if no device was provided
						if(device === TransportWebBluetooth.NO_DEVICE) {
			
							// Return getting device
							return navigator["bluetooth"].requestDevice({
							
								// Filters
								"filters": [
									{
									
										// Services
										"services": [
										
											// Service UUID
											TransportWebBluetooth.SERVICE_UUID
										]
									}
								]
							}).then(function(device) {
							
								// Resolve device
								resolve(device);
								
							// Catch errors
							}).catch(function(error) {
							
								// Reject error
								reject(error);
							});
						}
						
						// Otherwise
						else {
						
							// Resolve device
							resolve(device);
						}
					});
				};
				
				// Return getting device
				return getDevice().then(function(device) {
				
					// Get connection
					var getConnection = function() {
					
						// Return promise
						return new Promise(function(resolve, reject) {
						
							// Check if device's connection is already connected
							if(device["gatt"]["connected"] === true) {
							
								// Resolve connection
								resolve(device["gatt"]);
							}
							
							// Otherwise
							else {
							
								// Return getting connection to the device
								return device["gatt"].connect().then(function(connection) {
								
									// Check if connection is connected
									if(connection["connected"] === true) {
								
										// Resolve connection
										resolve(connection);
									}
									
									// Otherwise
									else {
									
										// Reject
										reject();
									}
								
								// Catch errors
								}).catch(function(error) {
								
									// Reject error
									reject(error);
								});
							}
						});
					};
				
					// Return getting connection
					return getConnection().then(function(connection) {
					
						// Check if connection is connected
						if(connection["connected"] === true) {
						
							// Initialize timeout occurred
							var timeoutOccurred = false;
						
							// Connection timeout
							var connectTimeout = setTimeout(function() {
							
								// Set timeout occurred
								timeoutOccurred = true;
							
								// Check if connection is connected
								if(connection["connected"] === true) {
							
									// Disconnect connection
									connection.disconnect();
								}
								
								// Reject
								reject();
								
							}, TransportWebBluetooth.CONNECT_TIMEOUT_DURATION_MILLISECONDS);
							
							// Return getting connection's service
							return connection.getPrimaryService(TransportWebBluetooth.SERVICE_UUID).then(function(service) {
							
								// Check if a timeout didn't occur
								if(timeoutOccurred === false) {
							
									// Clear connect timeout
									clearTimeout(connectTimeout);
									
									// Check if connection is connected
									if(connection["connected"] === true) {
								
										// Return getting service's notify characteristic
										return service.getCharacteristic(TransportWebBluetooth.NOTIFY_CHARACTERISTIC_UUID).then(function(notifyCharacteristic) {
										
											// Check if connection is connected
											if(connection["connected"] === true) {
										
												// Return getting service's write characteristic
												return service.getCharacteristic(TransportWebBluetooth.WRITE_CHARACTERISTIC_UUID).then(function(writeCharacteristic) {
												
													// Check if connection is connected
													if(connection["connected"] === true) {
													
														// Return starting notify characteristic's notifications
														return notifyCharacteristic.startNotifications().then(function() {
														
															// Check if connection is connected
															if(connection["connected"] === true) {
															
																// Disconnected handler
																var disconnectedHandler = function() {
																
																	// Remove GATT server disconnected event
																	device.removeEventListener("gattserverdisconnected", disconnectedHandler);
																
																	// Stop notifications and catch errors
																	notifyCharacteristic.stopNotifications().catch(function(error) {
																	
																	});
																};
														
																// Device GATT server disconnected event
																device.addEventListener("gattserverdisconnected", disconnectedHandler);
																
																// Return getting MTU from device
																return TransportWebBluetooth.sendRequest(connection, writeCharacteristic, notifyCharacteristic, TransportWebBluetooth.GET_MTU_COMMAND_TAG).then(function(response) {
																
																	// Check if connection is connected
																	if(connection["connected"] === true) {
																	
																		// Check if response is valid
																		if(response["length"] === 1) {
															
																			// Get MTU from response
																			var mtu = Math.min(response[0], TransportWebBluetooth.MAXIMUM_MTU);
																			
																			// Check if MTU is valid
																			if(mtu >= TransportWebBluetooth.MINIMUM_MTU) {
																			
																				// Create transport
																				var transport = new TransportWebBluetooth(connection, writeCharacteristic, notifyCharacteristic, mtu);
																				
																				// Resolve transport
																				resolve(transport);
																			}
																			
																			// Otherwise
																			else {
																			
																				// Disconnect connection
																				connection.disconnect();
																				
																				// Reject
																				reject();
																			}
																		}
																			
																		// Otherwise
																		else {
																		
																			// Disconnect connection
																			connection.disconnect();
																			
																			// Reject
																			reject();
																		}
																	}
																	
																	// Otherwise
																	else {
																	
																		// Reject
																		reject();
																	}
																	
																// Catch errors
																}).catch(function(error) {
																
																	// Check if connection is connected
																	if(connection["connected"] === true) {
																
																		// Disconnect connection
																		connection.disconnect();
																	}
																	
																	// Reject error
																	reject(error);
																});
															}
															
															// Otherwise
															else {
															
																// Return stopping notifications and catch errors
																return notifyCharacteristic.stopNotifications().catch(function(error) {
																
																// Finally
																}).finally(function() {
																
																	// Reject
																	reject();
																});
															}
															
														// Catch errors
														}).catch(function(error) {
														
															// Check if connection is connected
															if(connection["connected"] === true) {
														
																// Disconnect connection
																connection.disconnect();
															}
															
															// Reject error
															reject(error);
														});
													}
													
													// Otherwise
													else {
													
														// Reject
														reject();
													}
													
												// Catch errors
												}).catch(function(error) {
												
													// Check if connection is connected
													if(connection["connected"] === true) {
												
														// Disconnect connection
														connection.disconnect();
													}
													
													// Reject error
													reject(error);
												});
											}
											
											// Otherwise
											else {
											
												// Reject
												reject();
											}
										
										// Catch errors
										}).catch(function(error) {
										
											// Check if connection is connected
											if(connection["connected"] === true) {
										
												// Disconnect connection
												connection.disconnect();
											}
											
											// Reject error
											reject(error);
										});
									
									}
							
									// Otherwise
									else {
									
										// Reject
										reject();
									}
								}
								
							// Catch errors
							}).catch(function(error) {
							
								// Check if a timeout didn't occur
								if(timeoutOccurred === false) {
								
									// Clear connect timeout
									clearTimeout(connectTimeout);
							
									// Check if connection is connected
									if(connection["connected"] === true) {
								
										// Disconnect connection
										connection.disconnect();
									}
									
									// Check if disconnected error occurred
									if(error["code"] === (new DOMException("", "NetworkError"))["code"]) {
									
										// Return requesting transport
										return TransportWebBluetooth.request(device).then(function(transport) {
										
											// Resolve transport
											resolve(transport);
										
										// Catch errors
										}).catch(function(error) {
										
											// Reject error
											reject(error);
										});
									}
									
									// Otherwise
									else {
									
										// Reject error
										reject(error);
									}
								}
							});
						}
						
						// Otherwise
						else {
						
							// Reject
							reject();
						}
						
					// Catch errors
					}).catch(function(error) {
					
						// Check if device's connection is connected
						if(device["gatt"]["connected"] === true) {
						
							// Disconnect device's connection
							device["gatt"].disconnect();
						}
						
						// Reject error
						reject(error);
					});
					
				// Catch errors
				}).catch(function(error) {
				
					// Reject error
					reject(error);
				});
			});
		}
	
	// Private
	
		// Create packets
		static createPackets(commandTag, payload = TransportWebBluetooth.NO_PAYLOAD, mtu = TransportWebBluetooth.DEFAULT_MTU) {
		
			// Initialize packets
			var packets = [];
			
			// Check if payload doesn't exist
			if(payload === TransportWebBluetooth.NO_PAYLOAD) {
			
				// Set payload to an empty array
				payload = new Uint8Array([]);
			}
			
			// Initialize payload offset
			var payloadOffset = 0;
			
			// Go through all packets required to send the payload
			for(var i = 0; i === 0 || payloadOffset !== payload["length"]; ++i) {
			
				// Check if at the first packet
				if(i === 0) {
				
					// Create header
					var header = new Uint8Array([commandTag, i >> TransportWebBluetooth.BITS_IN_A_BYTE, i, payload["length"] >> TransportWebBluetooth.BITS_IN_A_BYTE, payload["length"]]);
				}
				
				// Otherwise
				else {
				
					// Create header
					var header = new Uint8Array([commandTag, i >> TransportWebBluetooth.BITS_IN_A_BYTE, i]);
				}
				
				// Get payload part length
				var payloadPartLength = Math.min(payload["length"] - payloadOffset, mtu - header["length"]);
				
				// Create packet
				var packet = new Uint8Array(header["length"] + payloadPartLength);
				packet.set(header);
				packet.set(payload.subarray(payloadOffset, payloadOffset + payloadPartLength), header["length"]);
				
				// Append packet to list
				packets.push(packet);
				
				// Update payload offset
				payloadOffset += payloadPartLength;
			}
			
			// Return packets
			return packets;
		}
		
		// Send request
		static sendRequest(connection, writeCharacteristic, notifyCharacteristic, commandTag, payload = TransportWebBluetooth.NO_PAYLOAD, mtu = TransportWebBluetooth.DEFAULT_MTU) {
		
			// Return promise
			return new Promise(function(resolve, reject) {
			
				// Check if connection is connected
				if(connection["connected"] === true) {
				
					// Initialize response
					var response = new Uint8Array([]);
					
					// Initialize response size
					var responseSize;
					
					// Initialize first response packet
					var firstResponsePacket = true;
					
					// Initialize sequence index
					var lastSequenceIndex;
					
					// Process response packet
					var processResponsePacket = function(event) {
					
						// Get response packet
						var responsePacket = new Uint8Array(event["target"]["value"]["buffer"]);
						
						// Get tag
						var tag = responsePacket[TransportWebBluetooth.COMMAND_TAG_INDEX];
						
						// Check if tag is invalid
						if(tag !== commandTag) {
						
							// Remove GATT server disconnected event
							connection["device"].removeEventListener("gattserverdisconnected", disconnectedHandler);
						
							// Remove notify characteristic value changed event
							notifyCharacteristic.removeEventListener("characteristicvaluechanged", processResponsePacket);
							
							// Check if connection is connected
							if(connection["connected"] === true) {
						
								// Reject
								reject();
							}
							
							// Otherwise
							else {
							
								// Reject error
								reject(new DOMException("", "NetworkError"));
							}
						}
						
						// Otherwise
						else {
						
							// Get sequence index
							var sequenceIndex = (responsePacket[TransportWebBluetooth.SEQUENCE_INDEX_INDEX] << TransportWebBluetooth.BITS_IN_A_BYTE) | responsePacket[TransportWebBluetooth.SEQUENCE_INDEX_INDEX + 1];
							
							// Check if first response packet
							if(firstResponsePacket === true) {
							
								// Check if sequence index is invalid
								if(sequenceIndex !== 0) {
								
									// Remove GATT server disconnected event
									connection["device"].removeEventListener("gattserverdisconnected", disconnectedHandler);
								
									// Remove notify characteristic value changed event
									notifyCharacteristic.removeEventListener("characteristicvaluechanged", processResponsePacket);
									
									// Check if connection is connected
									if(connection["connected"] === true) {
								
										// Reject
										reject();
									}
									
									// Otherwise
									else {
									
										// Reject error
										reject(new DOMException("", "NetworkError"));
									}
									
									// Return
									return;
								}
								
								// Clear first response packet
								firstResponsePacket = false;
								
								// Get response size
								responseSize = (responsePacket[TransportWebBluetooth.PAYLOAD_SIZE_INDEX] << TransportWebBluetooth.BITS_IN_A_BYTE) | responsePacket[TransportWebBluetooth.PAYLOAD_SIZE_INDEX + 1];
								
								// Get response part
								var responsePart = responsePacket.subarray(TransportWebBluetooth.PAYLOAD_INDEX);
							}
							
							// Otherwise
							else {
							
								// Check if sequence index is invalid
								if(sequenceIndex !== lastSequenceIndex + 1) {
								
									// Remove GATT server disconnected event
									connection["device"].removeEventListener("gattserverdisconnected", disconnectedHandler);
								
									// Remove notify characteristic value changed event
									notifyCharacteristic.removeEventListener("characteristicvaluechanged", processResponsePacket);
								
									// Check if connection is connected
									if(connection["connected"] === true) {
								
										// Reject
										reject();
									}
									
									// Otherwise
									else {
									
										// Reject error
										reject(new DOMException("", "NetworkError"));
									}
									
									// Return
									return;
								}
								
								// Get response part
								var responsePart = responsePacket.subarray(TransportWebBluetooth.PAYLOAD_INDEX - 2);
							}
							
							// Update last sequence index
							lastSequenceIndex = sequenceIndex;
							
							// Append response part to response
							var currentResponse = new Uint8Array(response["length"] + responsePart["length"]);
							currentResponse.set(response);
							currentResponse.set(responsePart, response["length"]);
							response = currentResponse;
							
							// Check if entire response has been received
							if(response["length"] === responseSize) {
							
								// Remove GATT server disconnected event
								connection["device"].removeEventListener("gattserverdisconnected", disconnectedHandler);
							
								// Remove notify characteristic value changed event
								notifyCharacteristic.removeEventListener("characteristicvaluechanged", processResponsePacket);
								
								// Check if connection is connected
								if(connection["connected"] === true) {
								
									// Resolve response
									resolve(response);
								}
								
								// Otherwise
								else {
								
									// Reject error
									reject(new DOMException("", "NetworkError"));
								}
							}
						}
					};
					
					// Disconnected handler
					var disconnectedHandler = function() {
					
						// Remove GATT server disconnected event
						connection["device"].removeEventListener("gattserverdisconnected", disconnectedHandler);
					
						// Remove notify characteristic value changed event
						notifyCharacteristic.removeEventListener("characteristicvaluechanged", processResponsePacket);
						
						// Reject error
						reject(new DOMException("", "NetworkError"));
					};
					
					// Notify characteristic value changed event
					notifyCharacteristic.addEventListener("characteristicvaluechanged", processResponsePacket);
					
					// Device GATT server disconnected event
					connection["device"].addEventListener("gattserverdisconnected", disconnectedHandler);
					
					// Get packets
					var packets = TransportWebBluetooth.createPackets(commandTag, payload, mtu);
					
					// Send packet
					var sendPacket = new Promise(function(resolve, reject) {
					
						// Check if connection is connected
						if(connection["connected"] === true) {
					
							// Resolve
							resolve();
						}
								
						// Otherwise
						else {
						
							// Reject error
							reject(new DOMException("", "NetworkError"));
						}
					});
					
					// Initialize sending packets
					var sendingPackets = [sendPacket];
					
					// Go through all packets
					for(var i = 0; i < packets["length"]; ++i) {
					
						// Get packet
						let packet = packets[i];
						
						// Send next pack after previous packet is send
						sendPacket = sendPacket.then(function() {
						
							// Return promise
							return new Promise(function(resolve, reject) {
							
								// Check if connection is connected
								if(connection["connected"] === true) {
								
									// Return writing packet
									return writeCharacteristic.writeValueWithResponse(packet).then(function() {
									
										// Check if connection is connected
										if(connection["connected"] === true) {
									
											// Resolve
											resolve();
										}
								
										// Otherwise
										else {
										
											// Reject error
											reject(new DOMException("", "NetworkError"));
										}
										
									// Catch errors
									}).catch(function(error) {
									
										// Check if connection is connected
										if(connection["connected"] === true) {
									
											// Reject error
											reject(error);
										}
								
										// Otherwise
										else {
										
											// Reject error
											reject(new DOMException("", "NetworkError"));
										}
									});
								}
								
								// Otherwise
								else {
								
									// Reject error
									reject(new DOMException("", "NetworkError"));
								}
							});
							
						// Catch errors
						}).catch(function(error) {
						
							// Return promise
							return new Promise(function(resolve, reject) {
							
								// Check if connection is connected
								if(connection["connected"] === true) {
							
									// Reject error
									reject(error);
								}
								
								// Otherwise
								else {
								
									// Reject error
									reject(new DOMException("", "NetworkError"));
								}
							});
						});
					}
					
					// Return sending all packets and catch errors
					return Promise.all(sendingPackets).catch(function(error) {
					
						// Remove GATT server disconnected event
						connection["device"].removeEventListener("gattserverdisconnected", disconnectedHandler);
					
						// Remove notify characteristic value changed event
						notifyCharacteristic.removeEventListener("characteristicvaluechanged", processResponsePacket);
						
						// Check if connection is connected
						if(connection["connected"] === true) {
						
							// Reject error
							reject(error);
						}
						
						// Otherwise
						else {
						
							// Reject error
							reject(new DOMException("", "NetworkError"));
						}
					});
				}
				
				// Otherwise
				else {
				
					// Reject error
					reject(new DOMException("", "NetworkError"));
				}
			});
		}
	
		// Service UUID
		static get SERVICE_UUID() {
		
			// Return service UUID
			return "13d63400-2c97-0004-0000-4c6564676572";
		}
		
		// Notify characteristic UUID
		static get NOTIFY_CHARACTERISTIC_UUID() {
		
			// Return notify characteristic UUID
			return "13d63400-2c97-0004-0001-4c6564676572";
		}
		
		// Write characteristic UUID
		static get WRITE_CHARACTERISTIC_UUID() {
		
			// Return write characteristic UUID
			return "13d63400-2c97-0004-0002-4c6564676572";
		}
		
		// Product name
		static get PRODUCT_NAME() {
		
			// Return product name
			return "Ledger??Nano??X";
		}
		
		// Default MTU
		static get DEFAULT_MTU() {
		
			// Return default MTU
			return 20;
		}
		
		// Minimum MTU
		static get MINIMUM_MTU() {
		
			// Return minimum MTU
			return 6;
		}
		
		// Maximum MTU
		static get MAXIMUM_MTU() {
		
			// Return maximum MTU
			return 100;
		}
		
		// No payload
		static get NO_PAYLOAD() {
		
			// Return no payload
			return null;
		}
		
		// Get MTU command tag
		static get GET_MTU_COMMAND_TAG() {
		
			// Return get MTU command tag
			return 0x08;
		}
		
		// APDU command tag
		static get APDU_COMMAND_TAG() {
		
			// Return APDU command tag
			return 0x05;
		}
		
		// APDU status length
		static get APDU_STATUS_LENGTH() {
		
			// Return APDU status length
			return (new Uint8Array([0x00, 0x00]))["length"];
		}
		
		// APDU success status
		static get APDU_SUCCESS_STATUS() {
		
			// Return APDU success status
			return 0x9000;
		}
		
		// No device
		static get NO_DEVICE() {
		
			// Return no device
			return null;
		}
		
		// Connect timeout duration milliseconds
		static get CONNECT_TIMEOUT_DURATION_MILLISECONDS() {
		
			// Return connect timeout duration milliseconds
			return 4000;
		}
		
		// Pairing duration threshold milliseconds
		static get PAIRING_DURATION_THRESHOLD_MILLISECONDS() {
		
			// Return pairing duration threshold milliseconds
			return 1000;
		}
		
		// Bits in a byte
		static get BITS_IN_A_BYTE() {
		
			// Rerurn bits in a byte
			return 8;
		}
		
		// Command tag index
		static get COMMAND_TAG_INDEX() {
	
			// Return command tag index
			return 0;
		}
		
		// Sequence index index
		static get SEQUENCE_INDEX_INDEX() {
		
			// Return sequence index index
			return TransportWebBluetooth.COMMAND_TAG_INDEX + 1;
		}
		
		// Payload size index
		static get PAYLOAD_SIZE_INDEX() {
		
			// Return payload size index
			return TransportWebBluetooth.SEQUENCE_INDEX_INDEX + 2;
		}
		
		// Payload index
		static get PAYLOAD_INDEX() {
		
			// Return payload index
			return TransportWebBluetooth.PAYLOAD_SIZE_INDEX + 2;
		}
}


// Main function

// Set window's transport WebUSB
window["TransportWebUSB"] = require("@ledgerhq/hw-transport-webusb")["default"];

// Set window's Buffer
window["Buffer"] = require("buffer")["Buffer"];

// Set window's transport web Bluetooth
window["TransportWebBluetooth"] = TransportWebBluetooth;

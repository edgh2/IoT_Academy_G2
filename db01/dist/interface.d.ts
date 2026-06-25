/**
 * MQTT message payload received for each tag reading.
 *
 * @typedef {Object} iMQTTPaylod
 * @property {string} timestamp - ISO 8601 timestamp of the reading.
 * @property {string} value - the reading value, stringified.
 */
export interface iMQTTPaylod {
    timestamp: string;
    value: string;
}
/**
 * Type guard validating that an unknown object matches the iMQTTPaylod shape
 * (an object with string timestamp and string value). Used to reject malformed
 * MQTT payloads before they reach the database.
 *
 * @param {*} obj - the parsed payload to validate.
 * @returns {boolean} true if obj is a valid iMQTTPaylod, false otherwise.
 *
 * @example
 * if (!is_iMQTTPayload(payload)) return;
 */
export declare function is_iMQTTPayload(obj: any): boolean;
//# sourceMappingURL=interface.d.ts.map
;
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
export function is_iMQTTPayload(obj) {
    if ((typeof obj === 'object') &&
        (typeof obj.timestamp === 'string') &&
        (typeof obj.value === 'string')) {
        return true;
    }
    else {
        return false;
    }
}
//# sourceMappingURL=interface.js.map
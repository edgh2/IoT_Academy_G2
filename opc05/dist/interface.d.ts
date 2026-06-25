/**
 * MQTT message payload published for each tag reading.
 *
 * @typedef {Object} iMQTTPaylod
 * @property {string} timestamp - ISO 8601 timestamp of the reading.
 * @property {string} value - the reading value, stringified.
 */
export interface iMQTTPaylod {
    timestamp: string;
    value: string;
}
//# sourceMappingURL=interface.d.ts.map
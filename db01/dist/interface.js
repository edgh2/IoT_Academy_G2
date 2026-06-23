;
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
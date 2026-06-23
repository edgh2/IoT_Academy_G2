export interface iMQTTPaylod{
    timestamp:string,
    value:string
};

export function is_iMQTTPayload(obj: any): boolean
{
	if ((typeof obj === 'object') &&
		(typeof obj.timestamp === 'string') &&
		(typeof obj.value === 'string')) 
	{
		return true;
	} else {
		return false;
	}
}
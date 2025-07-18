export function datetimeField({ initialEpoch = null, onUpdate }) {
    return {
        epoch: initialEpoch,
        datetimeStr: '',

        init() {
            this.syncDatetimeStr();
        },

        syncDatetimeStr() {
            if (this.epoch !== null) {
                this.datetimeStr = epochToDatetimeLocal(this.epoch);
            } else {
                this.datetimeStr = '';
            }
        },

        setEpoch(newEpoch) {
            this.epoch = newEpoch;
            this.syncDatetimeStr();
        },

        handleChange() {
            if (this.datetimeStr) {
                this.epoch = datetimeLocalToEpoch(this.datetimeStr);
                if (onUpdate) {
                    onUpdate(this.epoch);
                }
            }
        }
    };
}

export function epochToDatetimeLocal(epoch) {
    const date = new Date(epoch * 1000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function datetimeLocalToEpoch(value) {
    const [datePart, timePart] = value.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
    return Math.floor(date.getTime() / 1000);
}

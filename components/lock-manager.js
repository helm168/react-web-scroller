let _instance;

function setLocked(instance) {
    if (_instance && instance !== _instance) return;
    _instance = instance;
}

function clearLocked(instance) {
    if (_instance === instance) {
        _instance = undefined;
    }
}

function hasLocked() {
    return !!_instance;
}

function hasLockedWith(instance) {
    return instance === _instance;
}

export { setLocked, clearLocked, hasLocked, hasLockedWith };

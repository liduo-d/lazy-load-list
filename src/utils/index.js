const randomAccess = (min, max) => Math.floor(Math.random() * (min - max) + max);

const decodeUnicode = str => {
    str = "\\u" + str;
    str = str.replace(/\\/g, "%");
    str = unescape(str);
    str = str.replace(/%/g, "\\");
    return str;
};

export const getRandomContent = len => {
    let content = "";
    for (let i = 0; i < len; i++) {
        content += decodeUnicode(randomAccess(0x4e00, 0x9fa5).toString(16));
    }
    return content
};

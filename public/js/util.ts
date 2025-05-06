export function returnUsername() {
    let usernameElement = document.getElementById("username") as HTMLInputElement | null;
    let username = usernameElement ? usernameElement.value : "";
    if (username == "") {
        const arr1 = ['Fluffy', 'Sparkling', 'Dazzling', 'Vibrant', 'Mysterious', 'Delirious', 'Based', 'Monstrous', 'Swooning'];
        const arr2 = ['Ultra', 'Super', 'Dominant', 'Cool', 'Radiant', 'Magnificent', 'Glorious', 'Savage', 'Sick', 'Slick', 'Sneaky', 'Sne'];
        const arr3 = ['Man', 'Unicorn', 'Billy', 'Emmy', 'Bob', 'Chad', 'Chadwick'];

        username += arr1[Math.floor(Math.random() * arr1.length)];
        username += arr2[Math.floor(Math.random() * arr2.length)];
        username += arr3[Math.floor(Math.random() * arr3.length)];
        if (usernameElement) {
            usernameElement.value = username;
        }
    }
    return username.slice(0, 12);
}
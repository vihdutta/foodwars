export function returnUsername() {
  let usernameElement = document.getElementById(
    "username"
  ) as HTMLInputElement | null;
  let username = usernameElement ? usernameElement.value : "";
  if (username == "") {
    const arr1 = [
      "Fluffy",
      "Sparkling",
      "Dazzling",
      "Vibrant",
      "Mysterious",
      "Delirious",
      "Based",
      "Monstrous",
      "Swooning",
      "Ultra",
      "Super",
      "Dominant",
      "Cool",
      "Radiant",
      "Magnificent",
      "Glorious",
      "Savage",
      "Sick",
      "Slick",
      "Sneaky",
    ];

    const arr2 = [
      "Man",
      "Unicorn",
      "Billy",
      "Emmy",
      "Bob",
      "Chad",
      "Chadwick",
      "Ninja",
      "Goose",
      "Goblin",
      "Frog",
      "Ham",
      "Duck",
      "Rat",
      "Toad",
      "Shrek",
      "Zuck",
      "Peanut",
      "Pickle",
      "Wiggle",
      "Dingo",
      "Blob",
      "Meat",
      "Crab",
      "Boi",
      "Gremlin",
      "Wombat",
      "Snail",
      "Cheese",
    ];

    username += arr1[Math.floor(Math.random() * arr1.length)];
    username += arr2[Math.floor(Math.random() * arr2.length)];
    if (usernameElement) {
      usernameElement.value = username;
    }
  }
  return username.slice(0, 12);
}

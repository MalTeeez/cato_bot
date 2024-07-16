import fs from "node:fs";

const FILE_PATH = "../cache/dice_ranges.json";
var dice_ranges;

export async function init_dice_cache() {
  let file_contents;
  if (!fs.existsSync(FILE_PATH)) {
    file_contents = JSON.stringify(Array.from(new Map()));

    fs.writeFileSync(FILE_PATH, file_contents, { encoding: "utf-8", flag: "w+" });
  } else {
    file_contents = fs.readFileSync(FILE_PATH, {
      encoding: "utf-8",
      flag: "a+",
    });
  }

  dice_ranges = new Map(
    JSON.parse(file_contents).map((obj) => {
      return [obj[0], obj[1]];
    })
  );
}

export async function addOrAdjust(user, min, max) {
  dice_ranges.set(user, [min, max]);
  fs.writeFileSync(FILE_PATH, JSON.stringify(Array.from(dice_ranges)), {
    encoding: "utf8",
    flag: "w",
  });
}

export async function getRange(user) {
  let ranges = dice_ranges.get(user);
  return ranges ? ranges : [1, 6];
}

export async function removeEntry(user) {
  if (dice_ranges.get(user)) {
    dice_ranges.delete(user);
  }
}

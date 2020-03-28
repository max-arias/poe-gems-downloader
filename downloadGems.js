const gems = require('./gems.json');

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const getImageUrl = (html, baseName) => {
    const $ = cheerio.load(html);
    if ($('#global-wrapper').find('div.fullMedia p a').length > 0) {
      return $('div.fullMedia p a').attr('href');
    } else {
      throw new Error(baseName, ' : image URL not found.');
    }
};

const downloadImage = (url, imageId, dirPath) => {
    return axios({ url, method: 'GET', responseType: 'stream' })
        .then(res => {
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true }, err => {
                    if (err) {
                      throw new Error(err);
                    } else {
                      return;
                    }
                });
            }

            const writer = fs.createWriteStream(path.join(dirPath, `${imageId}.png`));
            res.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
        })
        .catch(() => {
            console.log('ERROR URL', url)
            return url
        })
};

const releasedGems = () => {
    return Object.keys(gems).reduce((acc, gemId) => {
        if (gems[gemId] && gems[gemId].base_item && gems[gemId].base_item.release_state && gems[gemId].base_item.release_state === "released") {
            return {
                ...acc,
                [gemId]: gems[gemId]
            }
        }

        return acc
    }, {});
}

const init = () => {
    if (!gems) {
        throw new Error('Missing gems.json file! View README')
    }

    // Filter unreleased gems
    const filteredGems = releasedGems(gems)

    Object.keys(filteredGems).map(gemId => {
        const gem = filteredGems[gemId]
        let gemName = null
        if (gem.active_skill && gem.active_skill.display_name) {
            gemName = gem.active_skill.display_name
        }

        if (!gemName && gem.base_item && gem.base_item.display_name) {
            gemName = gem.base_item.display_name
        }

        if (gemName) {
            gemName = gemName.replace('Awakened', '').trim().replace(/ /gmi, '_')
            const wikiUrl = `https://pathofexile.gamepedia.com/File:${gemName}_inventory_icon.png`
            return axios
              .get(wikiUrl)
              .then(res => {
                console.log('Wiki URL', wikiUrl)
                return getImageUrl(res.data, gemName);
              })
              .then(async imageUrl => {
                  const timeToWait = (Math.floor(Math.random() * 6) + 1) * 1000
                  console.log('time to wait', timeToWait)
                  await new Promise(resolve => setTimeout(resolve, timeToWait))
                  console.log('Image URL', imageUrl)
                  return downloadImage(imageUrl, gemId, './assets');
              })
              .catch(err => {
                console.error(err);
              });
        } else {
            console.log("error", gems[gemId])
        }
    })
}

init()

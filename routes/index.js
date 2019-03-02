const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const auth = require('http-auth');
const { body, validationResult } = require('express-validator/check');
const router = express.Router();
const Device = mongoose.model('Device');
const basic = auth.basic({
    file: path.join(__dirname, '../users.htpasswd'),
});

router.get('/', auth.connect(basic), (req, res) => {
    res.render('form', { title: 'POSP Updates'});
});

/**
 * @api {get} /checkUpdate Check if update exists
 * @apiName GetCheckUpdate
 * @apiGroup Update
 * @apiVersion 1.0
 *
 * @apiParam {String} device The user's device
 * @apiParam {Number} date The build date in the format "yymmdd"
 *
 * @apiSuccess {Object[]} response List of available updates
 * @apiSuccess {Number} response.datetime Build date expressed as UNIX timestamp
 * @apiSuccess {String} response.filename Name of the file to be downloaded
 * @apiSuccess {String} response.id A string that uniquely identifies the update
 * @apiSuccess {String} response.romtype The release type
 * @apiSuccess {String} response.size Size of the update expressed in bytes
 * @apiSuccess {String} response.url URL of the file to be downloaded
 * @apiSuccess {String} response.version Version to be compared against a prop
 *
 *
 * @apiSuccessExample {json} Success-Response:
 * {
    "response": [
        {
            "datetime": 1551462180,
            "filename": "potato_beryllium-9-20190302.Baked-v2.1.WEEKLY.zip",
            "id": "6f115c557c665548978795c84791c9c0",
            "romtype": "weekly",
            "size": 528541416,
            "url": "https://mirror.potatoproject.co/beryllium/weeklies/potato_beryllium-9-20190302.Baked-v2.1.WEEKLY.zip",
            "version": "2.1"
        }
    ]
}
 *
 * @apiError DeviceNotFound The device was not found
 * @apiErrorExample {json} Error-Response:
 *  HTTP/1.1 404 Not Found
 *  {
 *      "error": "DeviceNotFound"
 *  }
 *
 */
router.get('/checkUpdate', async (req, res) => {
    console.log(req);
    const reqDevice = req.query.device;
    const channelType = req.query.type;
    let returnJson = [];
    try {
        await Device.find({devicename: reqDevice, romtype: channelType}, async (err, devices) => {
            if (devices === null) {
                res.status(404).send({error: "DeviceNotFound"});
            } else {
                for (let index = 0; index < devices.length; index++) {
                    let currentDevice = devices[index];
                    returnJson.push(
                        {
                            datetime: Number(currentDevice.get('datetime')),
                            filename: currentDevice.get('filename'),
                            id: currentDevice.get('id'),
                            romtype: currentDevice.get('romtype'),
                            size: Number(currentDevice.get('size')),
                            url: currentDevice.get('url'),
                            version: currentDevice.get('version')
                        }
                    )
                }
                res.status(200).send({
                    response: returnJson
                });
            }
        });
    } catch (e) {
        console.log(e);
        res.status(404).send({error: "DeviceNotFound"});
    }
});

// Submit route
router.post('/pushUpdate', auth.connect(basic),
    [
        body('devicename')
            .isLength({ min: 1 })
            .withMessage('Please enter the device name.'),
        body('datetime')
            .isLength({ min: 1 })
            .isNumeric()
            .withMessage('Please enter the datetime.'),
        body('filename')
            .isLength({ min: 1 })
            .withMessage('Please enter the file name'),
        body('id')
            .isLength({ min: 1 })
            .withMessage('Please enter the id.'),
        body('romtype')
            .isLength({ min:1 })
            .withMessage('Please enter the release type'),
        body('size')
            .isLength({ min: 1 })
            .isNumeric()
            .withMessage('Please enter the file size.'),
        body('url')
            .isURL({ require_valid_protocol: true })
            .withMessage('Please enter a valid URL'),
        body('version')
            .isLength({ min: 1 })
            .withMessage('Please enter the version.'),
    ],
    (req, res) => {
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            const updateDevice = new Device(req.body);
            updateDevice.save().catch(error => { console.log(error); });
            res.status(200).send({ response: 'Successfully saved' });
        } else {
            res.render('form', {
                title: 'POSP Updates',
                errors: errors.array(),
                data: req.body
            });
        }
    });

module.exports = router;
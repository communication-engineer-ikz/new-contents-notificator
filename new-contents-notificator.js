/* 参考
    https://boomin.yokohama/archives/797
*/
function newContentsNotificator() {
  
    const DRIVE_FOLDER_ID = getDriveFolderId(); 
    const UPDATE_SHEET_ID = getUpdateSheetId();
    const UPDATE_SHEET_NAME = getUpdateSheetName();

    const folderData = getFolderData(DRIVE_FOLDER_ID);

    const spreadsheet = SpreadsheetApp.openById(UPDATE_SHEET_ID);
    const sheet = spreadsheet.getSheetByName(UPDATE_SHEET_NAME);
    const sheetData = getSheetData(sheet);

    const updateFolderList = [];

    for (key in folderData) {
        if (key in sheetData) {
            if (folderData[key].lastUpdate > sheetData[key].lastUpdate | folderData[key].filenum != sheetData[key].filenum) {
                updateFolderList.push(key);
                folderData[key].diff = folderData[key].filenum - sheet.getRange(sheetData[key].rowNo, 3).getValue();
                Logger.log(key+", folderData[key].diff: " + folderData[key].diff);
                sheet.getRange(sheetData[key].rowNo, 2).setValue(folderData[key].lastUpdate);
                sheet.getRange(sheetData[key].rowNo, 3).setValue(folderData[key].filenum);
                sheet.getRange(sheetData[key].rowNo, 4).setValue(folderData[key].url);
            }
        } else {
            var lowno = sheet.getLastRow() + 1
            sheet.getRange(lowno, 1).setValue(key);
            sheet.getRange(lowno, 2).setValue(folderData[key].lastUpdate);
            sheet.getRange(lowno, 3).setValue(folderData[key].filenum);
            sheet.getRange(lowno, 4).setValue(folderData[key].url);
            updateFolderList.push(key);
        }
    }

    // deleteFolderRecordFromList();
    // sendEMail();
}

function getFolderData(DRIVE_FOLDER_ID) {

    const driveFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const folders = driveFolder.getFolders();

    const folderData = {};

    while (folders.hasNext()) {

        let folder = folders.next();
        let lastFolderUpdateDate = folder.getLastUpdated();

        // フォルダ内のファイルの最終更新日時が新しい場合もあるのでそれに対応
        let files = folder.getFiles();

        while (files.hasNext()) {

            let fileobj = files.next();

            if (fileobj.getLastUpdated() > lastFolderUpdateDate) {
                lastFolderUpdateDate = fileobj.getLastUpdated();
            }
        }

        folderData[folder.getName()] = {
            name: folder.getName(),
            lastUpdate: lastFolderUpdateDate,
            filenum: getAllFilesId(folder).length,
            url: folder.getUrl(), 
            diff: 0
        };

    }

    return folderData;
}

function getSheetData(sheet) {

    const data = sheet.getDataRange().getValues();

    const sheetData = {};

    for (let i = 1; i < data.length; i++) {
        sheetData[data[i][0]] = {
            name: data[i][0],
            lastUpdate: data[i][1],
            filenum: data[i][2],
            url: data[i][3],
            rowNo: i + 1
        };
    }

    return sheetData;
}

function getAllFilesId(targetFolder) {
    var filesIdList = [];

    var files = targetFolder.getFiles();
    while (files.hasNext()) {
        filesIdList.push(files.next().getId());
    }

    var child_folders = targetFolder.getFolders();
    while (child_folders.hasNext()) {
        var child_folder = child_folders.next();
        filesIdList = filesIdList.concat(getAllFilesId(child_folder));
    }
    return filesIdList;
}

function deleteFolderRecordFromList() {

    var deleteFolderList = [];
    for (key in sheetData) {
        if (!(key in folderData)) {
        Logger.log(key + " is deleted. row" + sheetData[key].rowNo)
        sheet.deleteRow(sheetData[key].rowNo)
        deleteFolderList.push(key);
        }
    }
}

function sendEMail() {

    // 新規及び更新された情報をメール送信
    if (updateFolderList.length != 0 | deleteFolderList.length != 0) {

        var bodyText = photoFolder.getName() + "フォルダに、" + updateFolderList.length + "個のフォルダが追加(変更)されました。\n";
        bodyText += photoFolder.getUrl() + "\n\n";

        // フォルダ名、フォルダ更新日時、フォルダ内のファイル数
        if (updateFolderList != 0) {
        bodyText += "フォルダ名        \t枚数\tURL\n";
        for (key in updateFolderList) {
            fld = updateFolderList[key];
            bodyText += fld + "\t" + folderData[fld].filenum;
            if (folderData[fld].diff != 0) {
            //変更されたフォルダがある場合
            bodyText += "(" + folderData[fld].diff + ")";
            }
            bodyText += "枚" + "\t" + folderData[fld].url + "\n";
        }
        }

        if (deleteFolderList != 0) {
        bodyText += "\n以下のフォルダが削除されています。" + "\n";
        for (key in deleteFolderList) {
            fld = deleteFolderList[key];
            bodyText += fld + "\t" + sheetData[fld].filenum + "枚" + "\n";
        }
        }

        bodyText += "\n\nこのメールに返信しても見れませんので返信しないでください。";
        // Logger.log(bodyText)

        var titletext = "フォトアルバム【" + photoFolder.getName() + "】更新連絡通知";
        MailApp.sendEmail(DIST_MAIL_ADDRESS, SENDER_MAIL_ADDRESS, titletext, bodyText);

    } else {
        Logger.log("通知する更新情報がありません")
    }
}
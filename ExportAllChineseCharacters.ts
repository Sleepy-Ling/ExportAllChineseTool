import * as ts from 'typescript';
import * as fs from 'fs';
import path from 'path';
import * as async from 'async';
import { AsyncFunction } from 'async';
import { src_path } from './Config';

const extnameList: string[] = [".ts", ".js", ".json"];

async function traverseDirectory(dir: string): Promise<string[]> {
    let result: string[] = [];
    const files = await fs.promises.readdir(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.promises.stat(filePath);

        let extname = path.extname(file)
        if (stats.isDirectory()) {
            console.log(path.basename(file));
        }

        // console.log(path.basename(file), stats.isDirectory() && path.basename(file).startsWith("Scripts"), extname);

        if (stats.isDirectory()) {
            if (path.basename(file).startsWith("Scripts")) {
                result.concat(await traverseDirectory(filePath));
            }
        }
        else if (extnameList.includes(extname)) {
            // Promise.resolve(filePath);
            // console.log(filePath);
            result.push(filePath);
        }
    }

    return Promise.resolve(result);
}

/**遍历当前目录下全部有关中文字符的文件 */
async function traverseDirectoryGetChinese(dir: string): Promise<string[]> {
    let result: string[] = [];
    const files = await fs.promises.readdir(dir);

    // console.log("dir", dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.promises.stat(filePath);

        let extname = path.extname(file)

        if (stats.isDirectory()) {
            let temp = await traverseDirectoryGetChinese(filePath);
            result.push(...temp);

        }
        else if (extnameList.includes(extname)) {
            result.push(...extractChineseCharacters(filePath))
        }
    }


    return Promise.resolve(result);
}




/**获取指定文件中的中文字符（非注释） */
function extractChineseCharacters(filePath: string): string[] {
    // 读取文件内容
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    // console.log("fileContent",fileContent);


    // 创建源文件
    const sourceFile = ts.createSourceFile(
        filePath,
        fileContent,
        ts.ScriptTarget.Latest,
        true
    );

    const chineseCharacters: string[] = [];

    // 遍历语法树
    function visit(node: ts.Node) {
        // 检查节点是否在注释中
        if (!ts.isStringLiteral(node) && !ts.isIdentifier(node) && !ts.isJsxText(node)) {
            ts.forEachChild(node, visit);
            return;
        }

        // 获取节点文本
        const text = node.getText(sourceFile);

        // 提取中文字符
        const chineseChars = text.match(/[\u4e00-\u9fa5]+/g);
        if (chineseChars) {
            chineseCharacters.push(...chineseChars);
        }
    }

    // 开始遍历
    ts.forEachChild(sourceFile, visit);

    // console.log("chineseCharacters", chineseCharacters);


    return chineseCharacters;
}


let startTime: number = Date.now();

traverseDirectoryGetChinese(src_path).then((allStr) => {
    console.log("all:", allStr);

    let result: Set<string> = new Set();

    for (const str of allStr) {
        // console.log("s", str);

        for (const char of str) {
            result.add(char);
        }
    }
    // console.log(result);

    console.log("全部中文字符", Array.from(result).toString());

    let passTime: number = Date.now() - startTime;
    console.log("passTime", passTime);

    try {
        fs.writeFileSync('./result.txt', Array.from(result).toString(), 'utf8');
        console.log('File written successfully');
    } catch (err) {
        console.error('Error writing file:', err);
    }
})


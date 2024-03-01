const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const moment = require("moment");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
// or
// import {NotionToMarkdown} from "notion-to-md";

const notion = new Client({
  auth: process.env.NOTION_TOKEN,
});

function escapeCodeBlock(input) {
  const regex = /\n([\s]*)```([\s\S]*?)```/g;
  return input.replace(regex, function(match, leadingSpaces, codeBlock) {
    return "\n{% raw %}" + leadingSpaces + "```" + codeBlock + "```\n{% endraw %}";
  });
}

// passing notion client to the option
const n2m = new NotionToMarkdown({ notionClient: notion });

const category_map = {
  "effective-java" : "Effective Java",
  "unit-test" : "Unit Test",
  "etc" : "ETC",
  "java-spring" : "Java & Spring",
  "modern-javascript" : "Modern JavaScript",
  "real-mysql" : "Real MySQL",
}
(async () => {
  // ensure directory exists
  const root = "_posts";
  fs.mkdirSync(root, { recursive: true });

  const databaseId = process.env.DATABASE_ID;
  // TODO has_more
  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "공개",
      checkbox: {
        equals: true,
      },
    },
  });
  for (const r of response.results) {
    console.log(r)
    const id = r.id;
    // date
    let date = moment(r.created_time).format("YYYY-MM-DD");
    let pdate = r.properties?.["스터디 날짜"]?.["date"]?.["start"];
    if (pdate) {
      date = moment(pdate).format("YYYY-MM-DD");
    }
    // title
    let title = id;
    let ptitle = r.properties?.["목차"]?.["title"];
    if (ptitle?.length > 0) {
      title = ptitle[0]?.["plain_text"].replaceAll('.', '');
    }
    // tags
    let tags = [];
    let ptags = r.properties?.["태그"]?.["multi_select"];
    for (const t of ptags) {
      const n = t?.["name"];
      if (n) {
        tags.push(n);
      }
    }
    // categories
    let cats = r.properties?.["카테고리"]?.["select"]?.["name"];
    if (!cats) {
      cats  = 'etc';
    }

    // frontmatter
    let fmtags = "";
    let fmcats = "";
    if (tags.length > 0) {
      fmtags += "\ntags: [";
      for (const t of tags) {
        fmtags += t + ", ";
      }
      fmtags += "]";
    }
    if(cats){
      fmcats += "\ncategories:\n  - ";
      fmcats += category_map[cats];
    }
    const title_link = title.replace(/ /g, "-")
    const tags_for_excerpt = tags.length > 0 ? "\nexcerpt: " + tags.join() : ""
    const fm = `---
date: ${date}
title: "${title}"${fmtags}${fmcats}${tags_for_excerpt}

permalink: /${cats}/${title_link}/

toc: true
toc_sticky: true
---

`;
    const mdblocks = await n2m.pageToMarkdown(id);
    let md = n2m.toMarkdownString(mdblocks)["parent"];
    md = escapeCodeBlock(md);

    const ftitle = `${date}-${title.replaceAll(" ", "-")}.md`;

    let index = 0;
    let edited_md = md.replace(
      /!\[(.*?)\]\((.*?)\)/g,
      function (match, p1, p2, p3) {
        const dirname = path.join("assets/img", ftitle);
        if (!fs.existsSync(dirname)) {
          fs.mkdirSync(dirname, { recursive: true });
        }
        const filename = path.join(dirname, `${index}.png`);

        axios({
          method: "get",
          url: p2,
          responseType: "stream",
        })
          .then(function (response) {
            let file = fs.createWriteStream(`${filename}`);
            response.data.pipe(file);
          })
          .catch(function (error) {
            console.log(error);
          });

        let res;
        if (p1 === "") res = "";
        else res = `_${p1}_`;

        return `![${index++}](/${filename})${res}`;
      }
    );

    //writing to file
    fs.writeFile(path.join(root, ftitle), fm + edited_md, (err) => {
      if (err) {
        console.log(err);
      }
    });
  }
})();
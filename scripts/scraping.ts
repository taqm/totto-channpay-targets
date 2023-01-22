import fs from 'fs/promises';
import { JSDOM } from 'jsdom';

type ShopData = {
  id: number;
  shopName: string;
  exclusive: boolean;
  availableTickets: ('電子' | '紙')[];
  businessType: string;
  address: string;
  tel: string;
  holiday: string;
  businessHour: string;
};

const baseUrl = 'https://www.totto-chanpay2.com';
const sleep = () => new Promise((r) => setTimeout(r, 500));

const getDoc = async (url: string) => {
  const res = await fetch(url);
  await sleep();
  const html = await res.text();
  return new JSDOM(html).window.document;
};

const getDetailsPagePaths = async (page = 0): Promise<string[]> => {
  const doc = await getDoc(`${baseUrl}/frmShopSearchList.aspx?page=${page}`);
  console.log('fetched: page = ' + page);
  const anc = doc.querySelectorAll(
    '.shopsearchlist01 a',
  ) as NodeListOf<HTMLAnchorElement>;
  const paths = Array.from(anc).map((a: HTMLAnchorElement) => a.href);
  if (paths.length === 0) {
    return paths;
  }
  return paths.concat(await getDetailsPagePaths(page + 1));
};

const getDetailsPageData = async (path: string): Promise<ShopData> => {
  const id = Number(path.match(/id=(\d+)&/i)?.[1]);
  const doc = await getDoc(`${baseUrl}/${path}`);
  const shopName = doc.querySelector('h1')?.textContent ?? '';
  console.log('fetched: shopName = ' + shopName);
  const tds = doc.querySelectorAll(
    '.ShopSearchDetail_table tr td:nth-child(2)',
  );
  const [type1, type2, businessType, address, tel, holiday, businessHour] =
    Array.from(tds).map((td) => td.textContent ?? '');
  const availableTickets: ShopData['availableTickets'] = [];

  if (type1.includes('紙')) availableTickets.push('紙');
  if (type1.includes('電子')) availableTickets.push('電子');

  return {
    id,
    shopName,
    exclusive: type2.includes('専用'),
    availableTickets,
    businessType,
    address,
    tel,
    holiday,
    businessHour,
  };
};

const main = async () => {
  const paths: string[] = await getDetailsPagePaths();
  const shopDataList: ShopData[] = [];
  for (const path of paths) {
    const data = await getDetailsPageData(path);
    shopDataList.push(data);
  }
  shopDataList.sort((l, r) => l.id - r.id);
  await fs.writeFile(
    './data/shops.json',
    JSON.stringify(shopDataList, null, 2),
  );
};

main();

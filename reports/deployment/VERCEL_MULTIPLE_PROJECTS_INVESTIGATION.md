# Dieu Tra: Vi Sao Repo cws-portal Sinh Ra Nhieu Project Vercel (2026-07-31)

## Trang thai tong quan: ⚠️ Con viec can lam — mot phan ket luan CAN xac
nhan tren Vercel Dashboard (moi truong nay khong co cong cu/quyen truy
cap API Vercel).

Muc tieu: xac dinh vi sao xuat hien nhieu project Vercel tu cung 1 repo
(`cws-portal`, `cws-portal-project`, `cws-portal-azen`, `cws-portal-janb`,
`cws-portal-s9o5`...), khong tao them project moi, chi dieu tra + bao cao.

**Gioi han quan trong can biet truoc:** Moi truong lam viec nay **khong
co Vercel API/CLI/dashboard access nao ca** (khong co Vercel MCP tool,
khong co token cau hinh). Toan bo dieu tra duoi day dua tren **bang
chung phia repository** (file cau hinh, lich su git, CI workflow) — cac
ket luan lien quan truc tiep den Vercel Dashboard (vd project nao dang
that su nhan deploy) **KHONG THE xac nhan 100% tu day**, se ghi ro o
tung muc.

---

## 1. Bang chung da xac minh tu repository

### 1.1 Khong co `.vercel/project.json` trong repo, o BAT KY thoi diem nao

```
git log --all --full-history -- ".vercel/*" "**/.vercel/*"
git log --all --oneline -- "*.vercel*"
```

Ca 2 lenh deu **khong tra ve dong nao** — file link project
(`.vercel/project.json`, noi Vercel CLI luu `projectId`/`orgId` de nho
"repo nay da noi voi project nao") **chua tung ton tai trong git history
cua repo nay, o bat ky commit nao**. ✅ Da xac minh.

### 1.2 `.gitignore` KHONG liet ke `.vercel`

File `.gitignore` hien tai (9 muc, dong 1-29) — **khong co dong nao
loai tru `.vercel`**, khac voi template chuan Vite+Vercel (thuong luon
co `.vercel` trong `.gitignore`). ✅ Da xac minh — cho thay chua ai tung
chay `vercel` CLI thanh cong tu 1 checkout cuc bo cua repo nay va commit
nham file .vercel (neu co, se phai tu tay them dong gitignore o 1 thoi
diem nao do — khong thay dau vet nay).

### 1.3 Khong co script/CI/config nao trong repo tu goi Vercel

- `vercel.json`: **khong ton tai**.
- `.github/workflows/ci.yml` (workflow DUY NHAT trong repo): chi build/
  test/lint (backend + frontend), **khong co buoc nao goi `vercel`
  CLI, khong co Vercel token/secret nao duoc dùng**.
- `package.json` (goc + `backend/`): grep toan bo, **khong co script
  nao nhac toi "vercel"**.

✅ Da xac minh — **loai tru hoan toan** kha nang "script/CLI/token trong
repo tu dong tao project Vercel". Khong co co che tu dong nao trong ma
nguon gay ra viec nay.

### 1.4 Co che deploy DUY NHAT duoc ghi nhan: Vercel GitHub Integration

`README.md` (dong 30-32) ghi ro:

> Repo nay da ket noi Vercel — moi lan co commit moi tren nhanh `main`,
> Vercel tu dong build va deploy, khong can thao tac thu cong.

✅ Da xac minh (doc truc tiep README) — co che DUY NHAT duoc TAI LIEU
HOA la Vercel GitHub App (tich hop qua Vercel Dashboard, KHONG phai file
cau hinh trong repo) tu dong deploy khi push len `main`. Co che nay
duoc cau hinh HOAN TOAN tren Vercel Dashboard, khong de lai dau vet nao
trong git.

---

## 2. Tra loi 4 cau hoi

### 2.1 Project nao la production chinh?

⚠️ **KHONG THE xac dinh chac chan tu repo** — can kiem tra truc tiep
tren Vercel Dashboard (moi truong nay khong co quyen truy cap).

Cach xac dinh dung (Dy tu lam): vao tung project trong so 5 project
(`cws-portal`, `cws-portal-project`, `cws-portal-azen`, `cws-portal-janb`,
`cws-portal-s9o5`) > tab **Settings > Git** — CHI 1 trong so do dang
thuc su **ket noi voi repo GitHub `trankhanhduy1508-maker/cws-portal`
va nhanh `main`** (cac project con lai co the: khong ket noi git nao,
hoac ket noi nhung khong con webhook hoat dong). Project co ket noi
Git dang hoat dong + co Deployment gan nhat trung voi commit moi nhat
tren `main` (hien tai la `89abca8`) chinh la **production that**.

### 2.2 Vi sao cac project con lai duoc tao?

✅ **Ket luan co bang chung** (tu muc 1.1-1.3): vi `.vercel/project.json`
**chua tung ton tai** trong repo, moi lan co ai do (hoac chinh Dy) thuc
hien **"Add New... > Project" tren Vercel Dashboard va Import lai chinh
repo GitHub nay** (thay vi vao lai project cu da tao truoc do), Vercel
**khong co cach nao biet** "repo nay da duoc import roi" — no tao 1
project **HOAN TOAN MOI**.

Khi ten mac dinh (`cws-portal`, lay tu ten repo) **da bi 1 project
truoc do chiem**, Vercel tu dong gan **hau to ngau nhien 4-5 ky tu**
(vd `-azen`, `-janb`, `-s9o5`) de tranh trung ten — day la hanh vi
CHUAN cua nen tang Vercel khi import trung ten, khong phai loi hay tinh
nang dac biet cua repo nay.

`cws-portal-project` (hau to co nghia, khong ngau nhien) co the la 1
lan import khac dung ten tuy chinh thay vi de Vercel tu dat — van cung
1 nguyen nhan goc: import lai tu dau thay vi dung project da co.

### 2.3 Co phai do script/CLI/token hay cau hinh deploy?

❌ **KHONG** — da loai tru hoan toan o muc 1.3. Khong co script, CI
workflow, hay file cau hinh nao trong repo tu dong goi Vercel API/CLI de
tao project. Nguyen nhan la **hanh dong thu cong tren Vercel Dashboard**
(import lap lai), khong phai loi ky thuat/tu dong hoa trong ma nguon.

### 2.4 Co the hop nhat ve 1 project duy nhat khong?

✅ **Ve nguyen tac CO THE**, nhung day la thao tac **CHI LAM DUOC tren
Vercel Dashboard** (khong the tu dong hoa tu moi truong nay):

1. Xac dinh dung project nao la production that (muc 2.1).
2. Vao TUNG project con lai (`cws-portal-project`/`-azen`/`-janb`/
   `-s9o5`...) > Settings > kiem tra co Environment Variable nao **CHI
   co o project do** ma production dang thieu khong (vd neu 1 trong so
   nay lai la project THAT SU dang duoc dung, con "cws-portal" moi la
   ban rong) — **BAT BUOC kiem tra ky truoc khi xoa**, tranh xoa nham
   project dang chua cau hinh dung.
3. Sau khi chac chan, xoa cac project thua qua Settings > Advanced >
   Delete Project.
4. Voi project con lai (production that), vao Settings > Git xac nhan
   dung nhanh `main` cua dung repo.

**Toi khong tu thuc hien buoc nao o tren** (dung yeu cau "khong tao
them project moi" — va rong hon, khong co quyen/cong cu de thao tac tren
Vercel Dashboard tu moi truong nay).

---

## 3. Tom tat bang danh gia

| Cau hoi | Ket luan | Do chac chan |
|---|---|---|
| Project nao la production chinh | Can Dy tu kiem tra Settings > Git cua tung project | ⚠️ Chua xac nhan duoc tu repo |
| Vi sao cac project khac duoc tao | Import lap lai tren Dashboard, khong co `.vercel/project.json` de Vercel nho project cu, ten trung -> Vercel tu gan hau to ngau nhien | ✅ Co bang chung ro rang |
| Co phai do script/CLI/token/config | Khong — da loai tru script/CI/package.json/vercel.json trong repo | ✅ Co bang chung ro rang |
| Co hop nhat duoc khong | Co the, nhung phai lam tay tren Vercel Dashboard, can kiem tra Environment Variables truoc khi xoa | ✅ Ket luan ro, thao tac can Dy tu lam |

---

## 4. De xuat buoc tiep theo (CHUA thuc hien, chi de xuat)

1. Dy vao Vercel Dashboard, doi chieu Settings > Git cua ca 5 project,
   xac dinh dung 1 project dang active + co Environment Variables dung
   (`VITE_CWS_API_BASE_URL`/`VITE_CWS_WS_BASE_URL` tro toi Backend that).
2. Sau khi xac dinh xong, neu muon xoa bot project thua, nen **them
   `.vercel` vao `.gitignore`** (hien dang thieu, xem muc 1.2) de tranh
   commit nham file link project trong tuong lai — day la 1 sua doi nho,
   an toan, co the lam ngay neu Dy dong y (chua tu lam vi ngoai pham vi
   "chi dieu tra" duoc yeu cau).

---

**Commit:** (dien sau khi tao file va commit)
**Trang thai:** ⚠️ Con viec can lam — da xac dinh chinh xac CO CHE gay
ra nhieu project (import lap lai tren Dashboard, khong phai loi
script/CI/token trong repo), nhung **can Dy tu xac nhan tren Vercel
Dashboard** de biet chinh xac project nao la production va co du du
lieu de hop nhat an toan.

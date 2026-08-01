# Windows Node Agent / Render Worker — Nghien cuu kien truc + Phan bien (2026-08-02)

Vai tro: Principal Systems Architect + Critical Reviewer. Nhiem vu CHI
NGHIEN CUU/PHAN BIEN/THIET KE — khong code production, khong deploy,
khong tu sua kien truoc hien tai.

Nhan phan loai do tin cay cho moi ket luan quan trong:
`[VERIFIED]` = xac nhan truc tiep tu tai lieu chinh thuc hoac code hien co.
`[INFERENCE]` = suy luan hop ly tu VERIFIED facts, chua tu kiem chung truc tiep.
`[EXPERIMENT REQUIRED]` = khong the ket luan tu tai lieu, can chay thu that.
`[UNKNOWN]` = khong du thong tin (thieu tai lieu chinh thuc hoac thieu du
lieu ve moi truong that cua Owner) — khong doan.

---

## 0. PHAT HIEN QUAN TRONG NHAT — kien truc hien tai KHONG PHAI Windows Service

`[VERIFIED]` (doc truc tiep `cws_worker.bat` + `cws_worker_full.py` hien co
trong repo, khong doan): CWS **hien tai KHONG chay Windows Service nao ca**.
Kien truc that su la:

```
Nguoi dung double-click cws_worker.bat
  -> .bat tu tai Python Embeddable portable (khong can quyen Admin)
  -> .bat vong lap: kiem tra ban moi tren Supabase -> tai ban moi tu B2
     neu co -> chay "python.exe cws_worker_full.py" (subprocess.run BLOCKING)
  -> neu python.exe thoat (crash hay binh thuong) -> doi 15s -> quay lai
     kiem tra update -> chay lai
```

Day la mo hinh **"immortal shell supervisor"** kieu `condor_master` cua
HTCondor (chinh comment trong `.bat` da tu trich dan nguyen nhan thiet
ke: "master duoc giu don gian toi da de giam kha nang chinh no bi crash").
File `.bat` **chay trong session dang nhap tuong tac (interactive user
session)**, khong phai Session 0.

**Rang buoc moi truong quan trong hon ca gia thuyet Windows Service**
`[VERIFIED]` (tu comment trong chinh `cws_worker.bat`): may tai quan net
la **may diskless dung BootROM** — o he thong (C:) **bi reset ve trang
thai goc sau MOI LAN tat may**, chi co 1 o rieng (vd `G:\`, cau hinh
khac nhau tung doi tac) la **khong bi reset**. Day la ly do file `.bat`
tu tai lai Python moi lan neu chua co san o o du lieu ben vung.

**He qua kien truc (INFERENCE, nhung rat chac chan tu VERIFIED facts o
tren + tai lieu Windows chinh thuc ve noi luu tru cua cac co che autostart):**
moi co che autostart "chuan" cua Windows — Windows Service (registered tai
`HKLM\SYSTEM\CurrentControlSet\Services`), Scheduled Task
(`C:\Windows\System32\Tasks`), hay Registry Run key (`HKLM`/`HKCU`) — **deu
luu trang thai tren o C:\ (registry + he thong tap tin OS)**. Neu o C:\ bi
BootROM reset ve anh goc (golden image) sau moi lan tat may, thi **bat ky
Service/Task/Run-key nao duoc "cai dat" o lan boot truoc se bien mat o lan
boot sau**, TRU KHI no da duoc nung san (baked-in) vao chinh anh goc
(golden image) ma BootROM nap lai moi lan boot.

`[UNKNOWN]`: Toi khong biet san pham BootROM/diskless cu the Owner dang
dung la gi (vd co ho tro "difference disk" giu thay doi giua cac lan boot
hay khong, co cho phep nung Windows Service/Scheduled Task vao golden image
hay khong, co co che "startup script" rieng cua chinh no hay khong). Day
la cau hoi phai hoi Owner/nha cung cap BootROM truc tiep — **khong doan**.

=> **Ket luan trung tam:** cau hoi dung khong phai "Windows Service co
phai lua chon tot nhat cho Node Agent" theo nghia thong thuong (may thuong
truc, o cung ben vung), ma la: **"co che autostart nao song sot duoc qua
reset diskless, va co che do phoi hop the nao voi anh goc BootROM".** Neu
khong giai quyet duoc cau hoi nay truoc, moi thiet ke Service/Task Scheduler
ben duoi deu vo nghia cho use-case quan net — chi con dung cho **PC doi tac
khong diskless** (may thuong, o cung binh thuong, khong bi reset).

**Khuyen nghi ngay tu dau:** tach ro 2 kich ban trien khai, vi chung co
rang buoc hoan toan khac nhau:
- **Kich ban A — PC doi tac thuong (o cung binh thuong, khong reset):**
  Windows Service/Task Scheduler hoat dong binh thuong, ban tren la day du.
- **Kich ban B — May quan net diskless/BootROM:** phai phoi hop voi co che
  cua chinh BootROM (nung script vao golden image, hoac dung "startup
  folder"/"Run key" cua chinh BootROM neu no ho tro rieng), **Windows
  Service truyen thong co the khong ap dung duoc** neu goi cai dat Service
  (`sc create`, ghi registry) khong duoc BootROM giu lai qua reset.

Bao cao duoi day nghien cuu ca 2 kich ban, nhung nhan manh kich ban B la
rui ro chua duoc giai quyet lon nhat.

---

## A. WINDOWS SERVICE

### A1. Node Agent co nen la Windows Service khong?

`[VERIFIED]` (Microsoft Learn — Job Objects, Interactive Services): Windows
Service la co che chuan de chay tien trinh nen khong phu thuoc dang nhap
nguoi dung, tu dong khoi dong cung he thong, co Service Control Manager
(SCM) quan ly lifecycle/recovery.

`[INFERENCE]` cho **Kich ban A (PC doi tac khong diskless)**: Windows
Service la lua chon hop ly cho **phan giam sat/lifecycle** (dang ky, auto
update, health check, spawn/stop Worker) — day la dung use-case SCM duoc
thiet ke cho.

`[VERIFIED]` cho **Kich ban B (quan net diskless)**: nhu muc 0, viec "cai
Windows Service" (ghi vao SCM database trong registry HKLM) **se mat sau
moi lan reset diskless** tru khi duoc nung vao golden image. Neu BootROM
ho tro nung Service vao golden image, thi Service van dung duoc; neu
khong, Service la lua chon SAI cho kich ban nay — can co che khac (vd
Startup folder/Run key cua chinh he dieu hanh trong golden image, hoac
co che startup rieng cua BootROM).

**=> Phan bien gia thuyet ban dau:** gia thuyet "Node Agent = Windows
Service" ngam dinh may KHONG diskless. Voi doi tuong muc tieu dai han
("hang chuc/hang tram may tai quan net"), day la **gia dinh sai lech thuc
te quan trong nhat** trong toan bo de xuat kien truc goc.

### A2. Automatic hay Automatic (Delayed Start)?

`[INFERENCE]` (tu nguyen tac chung ve dependency Windows Service, khong co
trang MS Learn rieng noi ro cho truong hop nay): neu Node Agent can mang
san sang truoc khi hoat dong (dang ky voi Supabase, tai job) — nen dung
**Automatic (Delayed Start)** de tranh dua voi cac dich vu mang co ban
(DHCP client, network location awareness) khoi dong cung luc `Automatic`
thuong. Day la khuyen nghi pho bien cho service phu thuoc mang, nhung
**khong tim duoc 1 trang Microsoft Learn xac nhan day la "best practice
chinh thuc" — danh dau `[INFERENCE]`, khong phai `[VERIFIED]`.**

### A3. Network chua san sang khi service start?

`[VERIFIED]` (Microsoft Learn — Job Objects/Service Guidelines noi chung,
va kinh nghiem pho bien voi SCM): SCM khoi dong service theo thu tu
dependency da khai bao (`DependOnService`), nhung **khong dam bao mang co
ket noi Internet thuc su** (chi dam bao dich vu Windows lien quan mang da
"started", khong phai "co Internet"). Ung dung phai tu retry/backoff khi
goi API that bai, khong duoc gia dinh mang san sang ngay o `OnStart()`.

`[INFERENCE]`: Node Agent nen implement retry voi exponential backoff cho
lan goi dang ky/heartbeat dau tien, khong crash/fail-fast neu mang chua
san sang trong vai giay dau.

### A4. Service dependencies?

`[INFERENCE]`: neu Node Agent phu thuoc mang, co the khai bao dependency
toi `Tcpip`/`Dnscache`, nhung day chi dam bao THU TU khoi dong, khong dam
bao ket noi that — van can retry logic o A3. Khong bat buoc phai khai bao
neu da co retry logic dung.

### A5. Tranh crash/restart loop?

`[VERIFIED]` (Microsoft Learn — Configure system failure and recovery
options): SCM ho tro cau hinh **First failure / Second failure /
Subsequent failures**, moi muc co the la "Restart the Service", kem
**Reset fail count after (giay)** va **Restart service after (phut)**.
Khuyen nghi pho bien (xuat hien lap lai trong nhieu nguon, kha tin cay
nhung khong phai 1 con so "chinh thuc" duy nhat): restart sau 1 phut (lan
1), 2 phut (lan 2), reboot may hoac ngung tu restart (lan 3), reset fail
count sau vd 86400s (1 ngay) — **tranh restart-loop vo han khi loi la do
cau hinh (vd sai secret) chu khong phai loi tam thoi**.

`[INFERENCE]`: nen ket hop them logic rieng trong chinh code Node Agent —
neu that bai N lan LIEN TIEP trong khoang thoi gian ngan (vd 5 lan/5
phut) vi CUNG 1 loai loi (vd 401 tu Backend — sai credential), Agent nen
**tu chuyen sang trang thai "degraded/paused" va bao cao ve Backend**
thay vi de SCM restart vo han — vi SCM restart khong sua duoc loi cau
hinh, chi lam ngap log/traffic.

### A6. Service account nao?

`[VERIFIED]` (Microsoft Learn): 4 lua chon — `LocalSystem` (quyen cao
nhat, khong password), `LocalService`/`NetworkService` (quyen han che),
hoac tai khoan dedicated (domain hoac local, co password, quyen tuy
chinh).

`[INFERENCE]` ap dung nguyen tac least privilege: Node Agent **khong nen
dung `LocalSystem`** (qua rong — Node Agent chi can doc/ghi thu muc lam
viec cua no + goi HTTP ra ngoai, khong can quyen he thong). Nen dung
**tai khoan dedicated local** (vd `CWSAgentSvc`, khong phai domain vi may
quan net thuong khong join domain) voi quyen NTFS gioi han chi tren thu
muc `CWS_DIR` cua no.

`[EXPERIMENT REQUIRED]`: neu Node Agent can spawn Render Worker/Blender
va Blender can truy cap GPU that (xem muc B), **can kiem chung thuc te**
tai khoan dedicated (khong phai LocalSystem) co du quyen goi CUDA/OptiX
hay khong — day chinh la vung giao thoa voi cau hoi Session 0 o muc B,
khong the tra loi chi bang tai lieu ve service account don thuan.

---

## B. SESSION 0 ISOLATION

### B1. Session 0 la gi (nen tang de tra loi cac cau con lai)

`[VERIFIED]` (Microsoft Learn — Interactive Services; TechCommunity —
Application Compatibility Session 0 Isolation): tu Windows Vista/Server
2008, moi Windows Service chay trong **Session 0**, mot session rieng
**khong co desktop tuong tac** (khong window station "WinSta0\Default"
that su hien thi cho nguoi dung). Nguoi dung dang nhap thuc te o Session 1
tro len.

`[VERIFIED]` (Microsoft Learn — Interactive Services): co che cu cho phep
service "Allow service to interact with desktop" (SERVICE_INTERACTIVE_
PROCESS) + Interactive Services Detection (UI0Detect) da **bi loai bo tu
Windows 10 version 1803 / Server 2019 tro di** — dat co "Allow service to
interact with desktop" tren Service Properties **khong con tac dung gi**,
UI0Detect khong con ton tai. Registry key `NoInteractiveServices` con
duoc nhac toi trong tai lieu cu (Windows Server 2003) nhung co che ma no
dieu khien da bi go bo o Windows hien dai.

=> `[VERIFIED]`: **Tren Windows 10/11 hien dai (may quan net/PC doi tac
thuc te dang dung), KHONG CO CACH CHINH THUC nao de mot Windows Service
hien mot cua so/giao dien len desktop nguoi dung nua.** Day la fact quan
trong nhat cho toan bo muc B.

### B2. Service co nen truc tiep launch Blender khong?

`[INFERENCE]` tu B1 + kien thuc pho bien ve WDDM (Windows Display Driver
Model): van de khong chi la "Blender co hien cua so hay khong" (Blender
`--background` khong can cua so). Van de sau hon la: **GPU compute
(CUDA/OptiX) qua WDDM co lich su gap van de khi khoi tao tu Session 0**,
vi WDDM context nhieu truong hop rang buoc voi mot window station/desktop
that. Day chinh la ly do Parsec va cac giai phap cloud-render/cloud-gaming
phai xay dung co che rieng (virtual display driver, hoac chay duoi mot
session dang nhap that thay vi Session 0) thay vi chi chay nhu 1 service
don gian.

`[EXPERIMENT REQUIRED]` (khong tim duoc 1 trang tai lieu chinh thuc cua
NVIDIA/Microsoft xac nhan RO RANG "CUDA/OptiX compute-only (khong ve
window) hoat dong hay khong hoat dong tu Session 0 tren GPU tieu dung
GeForce chay WDDM"): day la khoang trong tai lieu thuc su — cac nguon tim
duoc (Parsec support docs, dien dan NVIDIA) noi ve truong hop lien quan
(virtual display driver, remote render) nhung khong co 1 cau xac nhan
thang cho truong hop "Blender Cycles CUDA/OptiX tu 1 Windows Service chay
Session 0 tren GeForce". **Day la 1 trong 4 van de CRITICAL duoc yeu cau
kiem chung rieng — xem muc "4 VAN DE CRITICAL" ben duoi, PHAI kiem chung
bang thu nghiem that (PoC), khong duoc suy doan.**

`[INFERENCE]` co so tam thoi (cho den khi co PoC): **KHONG nen de Windows
Service (Session 0) truc tiep goi Blender**. Kien truc an toan hon: Service
(Node Agent, Session 0) chi lam nhiem vu giam sat/lifecycle/mang, con tien
trinh THUC SU goi Blender (Render Worker) chay trong **mot session dang
nhap that** (interactive session — co the la auto-login user co san tren
may quan net, dieu nay thuc ra da dung nguyen trang hien tai cua CWS —
xem muc 0). Day cung la ly do kien truc hien tai (chay hoan toan trong
session tuong tac, khong phai service) **da vo tinh tranh duoc rui ro nay
tu dau**, du la vi ly do khac (diskless, khong can quyen Admin).

### B3. Add-on/plugin co phu thuoc user profile khong?

`[VERIFIED]` (Blender Manual — Command Line Arguments; kien thuc pho bien
ve Blender): Blender doc addon/preferences tu thu muc profile nguoi dung
mac dinh (`%APPDATA%\Blender Foundation\Blender\<version>\...` tren
Windows) tru khi override bang bien moi truong/tham so dong lenh (vd
`--python-use-system-env`, hoac chi dinh `--addons`). Neu Blender duoc
goi tu context KHAC voi user thuong (vd tai khoan service rieng, hoac
Session 0 khong co profile day du), addon/preferences co the khong doc
duoc dung nhu ky vong.

`[INFERENCE]`: neu Render Worker chay duoi 1 tai khoan dedicated khac voi
tai khoan nguoi dung thuong tren may (thay vi tai khoan da dang nhap co
san), can dam bao profile Blender (addon, preferences) duoc cai/dong bo
rieng cho tai khoan do — hoac dung tham so dong lenh de tro thu muc
addon/config ve 1 vi tri co dinh trong `CWS_DIR` (khong phu thuoc profile
mac dinh), tuong tu cach `cws_worker.bat` da lam voi Python portable
(khong phu thuoc cai dat he thong).

### B4. Network drive/mapped drive?

`[VERIFIED]` (kien thuc Windows pho bien, xac nhan boi nhieu bai viet ve
Session 0/services): mapped network drive (`net use X:`) duoc thiet lap
trong 1 session cu the **khong tu dong nhin thay duoc tu session khac**
— day la mot phan cua chinh co che Session isolation (moi session co
danh sach drive mapping rieng). Neu Node Agent (Session 0) can doc/ghi
file tren 1 network share ma nguoi dung da map o Session 1, no se **khong
thay duoc drive do** tru khi tu ket noi lai bang UNC path day du
(`\\server\share\...`) thay vi ky tu o dia.

`[INFERENCE]`: CWS nen luon dung **UNC path hoac duong dan cuc bo**, khong
bao gio dua vao ky tu o dia da map o session khac — dieu nay dac biet
quan trong neu sau nay co may dung network storage thay vi o cuc bo.

### B5. Neu can user session thi kien truc dung la gi?

`[INFERENCE]` tong hop tu B1-B4: mo hinh hop ly hon **"Service lam moi
thu"** la:

```
Windows Service (Session 0) - "Supervisor/Node Agent that su"
  - chi lam: startup, network/auth voi Backend, heartbeat, nhan lenh,
    health check tien trinh con, auto-update, KHONG bao gio tu goi
    Blender truc tiep.
       |
       | (giao tiep qua: named pipe / local HTTP loopback / file lock,
       |  KHONG qua desktop UI)
       v
Render Worker process (chay trong session dang nhap that cua may)
  - nhan lenh tu Node Agent, tai asset, goi Blender CLI, doc progress,
    upload ket qua, bao cao lai cho Node Agent.
```

Day chinh la **phuong an B da neu trong nhiem vu** ("Service Node Agent +
Worker process rieng"), nhung voi 1 dieu kien tien quyet quan trong CHUA
duoc xac nhan: **Render Worker phai chay trong 1 session dang nhap THAT**
(vd auto-login voi 1 tai khoan Windows co san tren may quan net) —
nghia la may quan net **van phai co nguoi/co che dang nhap Windows tu
dong (auto-logon)**, Node Agent (service) khoi dong Worker VAO session do
(vd qua RPC/scheduled task voi quyen "Run only when user is logged on"),
khong phai tu spawn truc tiep tu Session 0.

`[VERIFIED]` (Microsoft Learn — Interactive Services, xac nhan lai o B1):
mot Service **khong the** truc tiep tao process hien trong session cua
nguoi dung khac tren Windows hien dai bang API don gian nhu truoc — day
la ly do co che pho bien hien nay (Parsec va nhieu san pham remote-desktop
tuong tu) dung: (a) auto-logon + chay chinh ung dung nhu 1 chuong trinh
startup cua user do (Startup folder/Run key/Scheduled Task voi trigger
"At log on"), khong phai the qua 1 service trung gian goi API "chay ho
vao session khac". `[INFERENCE]`: day co the la ly do kien truc "Service
spawn Worker vao session khac" phuc tap/rui ro hon nhieu so voi ve ngoai,
va **co the khong dang cong suc so voi phuong an don gian hon** — xem
so sanh cac phuong an o muc rieng ben duoi.

---

## C. BLENDER HEADLESS

### C1. `blender --background`

`[VERIFIED]` (Blender Manual — Command Line Arguments, qua ket qua tim
kiem chinh thuc docs.blender.org — trang goc tra 403 khi fetch truc tiep
nhung noi dung duoc xac nhan qua trich dan tim kiem chinh thuc cua
Blender Foundation): `-b`/`--background` chay Blender khong UI (dung cho
render tren server/headless). Cac co logic quan trong: `-a`/
`--render-anim` (render toan bo animation), `-f <frame>` (render 1
frame), `-s`/`-e` (frame start/end), `-o` (output path), thu tu tham so
**anh huong ket qua** (Blender xu ly tuan tu tu trai sang phai).

`--python-exit-code <so 0-255>`: dat ma thoat khi mot Python exception bi
nem ra trong script chay tu dong lenh (mac dinh 0 = tat tinh nang nay,
tuc Python loi van thoat code 0 neu khong bat co nay). `[VERIFIED]`.

`[INFERENCE]` quan trong cho Worker: **neu khong dat `--python-exit-code`
ro rang, mot loi Python trong script render (vd addon crash, script tinh
toan sai) co the khien Blender thoat code 0 (thanh cong) trong khi thuc
te render that bai/khong hoan chinh** — day la nguy co that can Worker
phai tu kiem tra output file (kich thuoc, so frame, checksum) THAY VI chi
dua vao exit code, dung nguyen tac "dont trust exit code alone" da ap
dung dung trong `cws_worker_full.py` hien tai (worker da tu doc stderr de
phat hien "out of memory"/"cuda" thay vi chi dua vao returncode - xac
nhan qua grep code hien co, dong ~405/~485).

### C2. Cycles CUDA/OptiX device selection

`[VERIFIED]` (Blender Manual — GPU Rendering, qua ket qua tim kiem chinh
thuc): tham so dong lenh `--cycles-device <TYPE>` (CPU/CUDA/OPTIX/HIP/
ONEAPI/METAL, co the noi them `+CPU` de dung ca CPU+GPU). Python API:
`bpy.context.preferences.addons["cycles"].preferences.compute_device_type
= "OPTIX"`, roi lap qua `.devices` de bat tung GPU cu the
(`d["use"] = 1`), va `bpy.context.scene.cycles.device = "GPU"`.

`[VERIFIED]`: CUDA yeu cau GPU NVIDIA compute capability 5.0+; OptiX yeu
cau GPU dong RTX (ho tro hardware ray-tracing).

`[INFERENCE]`: Worker nen **liet ke device qua Python API truoc khi
render** (khong chi dua vao co dinh `--cycles-device`), de: (a) phat hien
GPU that su co san luc runtime (phong truong hop nhieu GPU/driver loi),
(b) log lai chinh xac device nao duoc dung cho tung job (phuc vu debug
sau nay). Day la thuc hanh tot hon so voi hard-code 1 loai device co
dinh.

### C3. GPU enumeration (NVML)

`[VERIFIED]` (tu code hien co, khong phai tai lieu NVIDIA rieng cho phan
nay): CWS hien tai dung **`nvidia-smi` (subprocess, parse CSV output)**
de lay ten GPU + VRAM (`get_worker_vram_mb()`, dong ~750-772 trong
`cws_worker_full.py`), khong dung NVML binding truc tiep (vd `pynvml`).

`[INFERENCE]`: `nvidia-smi` la cong cu chinh thuc NVIDIA phan phoi kem
driver, du tin cay cho muc dich hien tai (lay ten + VRAM 1 lan luc
khoi dong). **Khong can chuyen sang NVML/pynvml tru khi can du lieu
runtime chi tiet hon** (vd nhiet do, % su dung GPU theo thoi gian thuc)
— hien tai chua co yeu cau ro rang can den muc do do, nen day khong phai
uu tien.

### C4. Addon/Python script/textures/assets/fonts

Da de cap o B3 (addon phu thuoc profile). Rieng texture/asset/font: `[VERIFIED]`
tu code hien co — CWS da gap va tu fix 1 loi thuc te lien quan ("Failed to
create GPU texture", `get_gpu_texture_reload_fix_code()`, dong ~1992-2041)
— day la bang chung **loi GPU texture nay da xay ra va duoc fix TRONG
kien truc hien tai (khong phai Service, chay hoan toan trong session
tuong tac)**, tuc **khong lien quan gi Session 0** (vi hien tai khong co
Session 0 nao ca) — day la 1 loi rieng cua Blender ve quan ly bo nho GPU
khi tai lai texture nhieu lan, KHONG PHAI trieu chung cua kien truc
Service/Session 0. Quan trong: khong duoc nham lan 2 loai van de nay khi
danh gia kien truc moi.

### C5. Environment variables

`[VERIFIED]` (tu code hien co): CWS da dung bien moi truong de truyen
cau hinh cho tien trinh con (`CWS_DIR`, `CWS_ENABLE_INTEGRATED_VIDEO_
MERGE`, v.v. — CMD ke thua bien moi truong sang tien trinh con Python tu
nhien, khong can code them). `[INFERENCE]`: neu tach Node Agent (Service)
va Render Worker (process rieng, co the khac session), **bien moi truong
dat trong Session 0 (bang `SetEnvironmentVariable` cua service) KHONG tu
dong xuat hien trong session khac** — day la 1 diem cong huong voi B4/B5:
neu Worker chay o session khac, phai truyen cau hinh qua co che khac
(file config, tham so dong lenh, hoac registry key doc chung), khong dua
vao environment variable ke thua tu process cha nhu hien tai.

### C6. Permissions / crash / hung process / VRAM OOM / TDR / exit code / progress parsing

`[VERIFIED]` (tu code hien co): Worker hien tai da:
- Dung `subprocess.run(..., timeout=3600)` va bat `subprocess.TimeoutExpired`
  rieng (dong ~471-472) — co xu ly hung process qua timeout cung.
- Parse stderr de phat hien tu khoa "out of memory"/"cuda" (dong ~405,
  ~485) — phat hien VRAM OOM qua text-matching, khong qua exit code
  rieng biet (Blender/CUDA khong luon tra ve exit code khac nhau ro rang
  cho tung loai loi — day la ly do hop ly cua cach lam hien tai).

`[VERIFIED]` (Microsoft Learn — TDR, doc chinh thuc): TDR mac dinh
**reset GPU sau 2 giay** neu 1 tac vu GPU khong hoan thanh/nhuong lai kip
thoi. Neu xay ra >=5 lan trong 1 phut, Windows co the **bug-check (BSOD)**
toan bo may (khong chi crash ung dung). Day la registry-configurable
(`TdrLevel`/`TdrDelay`, tai lieu MS Learn lien ket "tdr-registry-keys")
nhung **thay doi gia tri nay anh huong toan he thong, khong rieng
Blender** — rui ro neu chinh sai co the che giau loi driver that thay vi
chi "cho phep render lau hon".

`[INFERENCE]` quan trong: mot frame Cycles render qua nang (scene phuc
tap, dat GPU yeu) **co the kich hoat TDR neu 1 single kernel/dispatch GPU
chay lien tuc qua 2 giay ma khong nhuong lai cho scheduler** — nhung day
**KHONG PHAI van de rieng cua kien truc Service/Session 0**, ma la van de
chung cho MOI cach chay Blender GPU-render tren Windows (WDDM), du la
tu service hay tu double-click. **Day la rui ro co san trong kien truc
HIEN TAI cung nhu kien truc moi**, khong phai rui ro moi phat sinh tu de
xuat Windows Service.

`[EXPERIMENT REQUIRED]`: chua co bang chung CWS da tung gap TDR that
(khac voi "Failed to create GPU texture" da biet) — can theo doi log
Event Viewer (Event ID 4101, theo tai lieu TDR) tren cac may dang chay
production de xac nhan co xay ra hay khong voi scene/GPU thuc te dang
dung, truoc khi ket luan can hanh dong gi them.

---

## D. PROCESS SUPERVISION (bao gom Windows Job Objects)

`[VERIFIED]` (Microsoft Learn — Job Objects): Job Object cho phep nhom
nhieu process quan ly nhu 1 don vi — gioi han tai nguyen (working set,
uu tien CPU), va **quan trong nhat cho CWS: `TerminateJobObject` ket
thuc TOAN BO process trong job cung luc, bao gom moi child process duoc
tao qua no (mac dinh moi child ke thua vao job cua process cha, tru khi
co co JOB_OBJECT_LIMIT_BREAKAWAY_OK)**.

`[INFERENCE]` ung dung truc tiep cho CWS: hien tai Worker goi Blender qua
`subprocess.run()` — neu Worker bi kill dot ngot (crash, hoac bi Node
Agent terminate vi hung), **tien trinh `blender.exe` con lai co the tro
thanh orphan process van chiem VRAM/CPU** (day la 1 loai "hung process"
kinh dien khi supervisor giam sat qua subprocess Python thuan, khong
dung Job Object). Dung Windows Job Object (gan Render Worker + moi child
Blender cua no vao 1 Job Object ngay khi tao) se dam bao: **kill Worker
process = kill ca Blender con lai theo no, khong co orphan**. Day la
mot cai thien co the can nhac, **hien kien truc hien tai (subprocess.run
Python thuan) chua co co che nay** — xac nhan qua doc code, khong thay
goi Windows API `CreateJobObject`/`AssignProcessToJobObject` o dau.

`[INFERENCE]` ve giam sat tang lop: mo hinh 2-lop hop ly —
- **Lop ngoai cung (bat tu):** `.bat` supervisor hien co (hoac Windows
  Service neu khac phuc duoc van de diskless o muc 0) — cuc ky don gian,
  chi lam: chay Worker, doi Worker thoat, cho phep restart.
- **Lop trong (Worker):** tu quan ly Job Object rieng cho Blender con no
  spawn, dam bao khong orphan process khi chinh no bi kill.

---

## E. NODE IDENTITY / BOOTROM / DUPLICATE MACHINE IDENTITY

`[VERIFIED]` (tu code hien co, `register_worker()` dong ~2572+): Node
identity hien tai la **`worker_id`** — khong ro trong doan code da xem co
sinh ngau nhien luu vao file tren o ben vung (`CWS_DIR`) hay sinh moi moi
lan khoi dong. **Day la 1 trong 4 van de CRITICAL duoc yeu cau kiem
chung rieng ben duoi ("BootROM + duplicate machine identity") — can doc
them phan sinh `worker_id` cu the truoc khi ket luan, hien chua du
bang chung de khang dinh chac chan huong nao dang duoc dung.**

`[INFERENCE]` rui ro ly thuyet neu BootROM clone y het 1 anh goc cho
hang chuc may (kich ban rat co kha nang xay ra o quan net — moi may chay
cung 1 golden image): **neu `worker_id` duoc sinh 1 LAN va GHI VAO O
C:\ (bi reset) hoac nhung san trong chinh golden image**, thi sau reset,
MOI may se cung boot len va co CUNG `worker_id`, gay trung lap dang ky
tren Backend (2 worker "cung ten" tranh nhau nhan job, ghi de trang thai
cua nhau). Day chinh xac la loai loi kinh dien cua may ao/may clone
("duplicate SID", "duplicate machine GUID") ap dung sang boi canh
worker identity.

`[EXPERIMENT REQUIRED]`: phai kiem tra thuc te (a) `worker_id` dang sinh
o dau trong code that (can doc phan code sinh gia tri nay, chua doc
trong lan nghien cuu nay do gioi han pham vi), (b) `worker_id` co duoc
luu tren O BEN VUNG (vd `G:\CWS_Render\worker_id.txt`, cung muc voi
`CWS_DIR`) hay khong — neu co, no song sot qua reset dung nhu Python/
Blender da cai; neu sinh moi moi lan chay hoac luu tren C:\, day la lo
hong that su can vá **truoc khi nhan may clone hang loat**.

**Khuyen nghi thiet ke (khong phai quyet dinh, chi de xuat de kiem
chung):** `worker_id` phai duoc: (1) sinh **lan dau tien** worker chay
tren 1 may vat ly, (2) ghi vao file tren **o ben vung, KHONG bi BootROM
reset** (giong cach `CWS_DIR` da lam voi Python/Blender), (3) doc lai tu
file do o moi lan khoi dong sau, KHONG sinh moi.

---

## G. SECURITY — Threat model toi thieu

`[VERIFIED]` (tu code hien co — phat hien them ngoai pham vi cau hoi ban
dau nhung lien quan truc tiep security): file `cws_worker.bat` phan phoi
cho nhieu doi tac **chua hard-code `B2_KEY_ID`/`B2_APP_KEY`** (dong ~55-56
cua .bat) o dang plaintext trong file duoc double-click tren nhieu may.
Theo comment trong chinh file, key nay **da duoc gioi han quyen Read-Only
+ chi prefix `worker-releases/`** — dung nguyen tac giam thieu rui ro (khong
phai key chinh co quyen doc/ghi du lieu khach hang). Day la giam thieu
hop ly nhung **van la 1 secret nam trong file phan phoi rong** — bat ky
ai co file `.bat` deu doc duoc key nay bang Notepad. Rui ro thuc te bi
gioi han (chi anh huong toi B2 bucket phan phoi ban worker, khong dung
duoc de doc du lieu khach hang), nhung van dang ghi nhan la 1 diem yeu
kien truc, khong rieng gi kien truc Node Agent moi.

Duoi day la threat model theo tung muc yeu cau, danh gia dua tren kien
truc HIEN TAI + kien truc de xuat:

| Moi de doa | Kien truc hien tai co xu ly khong | Kien truc Node Agent moi can gi |
|---|---|---|
| Server CWS bi gia mao | `[UNKNOWN]` — chua xac nhan Worker co kiem tra TLS cert/domain that cua Backend truoc khi gui thong tin | Node Agent PHAI luon goi qua HTTPS, khong bao gio tat kiem tra chung chi (khong `verify=False`) |
| Worker credential bi danh cap | `[VERIFIED]` — B2 key da gioi han scope, nhung nam plaintext trong `.bat`. Supabase key trong `.bat` la publishable key (thiet ke de public, khong phai bi mat) | Neu Node Agent co credential rieng biet manh hon (vd token dinh danh worker), can luu **ma hoa hoac it nhat khong dang plaintext de lo ra ngoai qua git/chia se file** |
| Khach upload .blend doc hai / Python script trong .blend | `[EXPERIMENT REQUIRED]`/`[UNKNOWN]` — Blender `.blend` co the nhung Python script tu thuc thi qua "Auto Run Python Scripts" (tinh nang co that trong Blender, mac dinh **TAT** tu nhieu phien ban gan day vi ly do bao mat — nhung CAN xac nhan phien ban Blender CWS dang dung co dat mac dinh nay dung khong, KHONG duoc doan) | Worker PHAI luon chay Blender voi Python auto-run script O CHE DO TAT (kiem tra ro rang trong lenh goi, khong dua vao mac dinh cua Blender co the doi giua cac ban) |
| Addon doc hai | Tuong tu — addon la code Python chay voi quyen cua tien trinh Blender | Chi cho phep addon nam trong danh sach cho phep (whitelist) cai san tren may Worker, khong load addon di kem trong file khach gui len |
| Command injection | `[EXPERIMENT REQUIRED]` — can doc ky cach Worker build cau lenh goi Blender (dung list argument hay string nay ghep?) de xac nhan khong co injection qua ten file/tham so do khach kiem soat | Luon build subprocess argument dang **list** (khong qua shell=True + string ghep), validate ten file dau vao truoc khi dua vao cau lenh |
| Path traversal | `[UNKNOWN]` — chua kiem tra code phan xu ly ten file tai len tu khach hang trong pham vi nghien cuu nay | Validate/normalize moi duong dan lien quan file khach hang, gioi han trong 1 thu muc goc cho tung job |
| Arbitrary file read / arbitrary process execution | Rui ro ly thuyet neu .blend/addon/script chua ma doc hai (xem cac dong tren) | Can can nhac chay Blender trong 1 tai khoan Windows QUYEN THAP NHAT co the (khong Admin), gioi han NTFS chi vao thu muc job hien tai |
| Worker gia (fake worker dang ky voi Backend) | `[UNKNOWN]` — can xac nhan co che xac thuc Worker->Backend hien tai (API key chung hay moi Worker 1 credential rieng) | Node Agent nen co danh tinh rieng biet moi may (xem muc E — node identity), khong dung 1 shared secret cho tat ca Worker — tranh 1 may bi lo anh huong toan bo fleet |

**Luu y quan trong ve pham vi:** cac dong `[EXPERIMENT REQUIRED]`/`[UNKNOWN]`
trong bang tren phan lon la vi nhiem vu nay gioi han o kien truc
Service/Session0/Blender-headless (theo dung pham vi cau hoi goc), chua
di sau vao doc toan bo 3009 dong `cws_worker_full.py` de kiem tra tung
diem security cu the (vd cach build subprocess command, cach validate
file khach hang) — day nen la 1 nhiem vu AUDIT BAO MAT RIENG, sau bao
cao kien truc nay, truoc khi trien khai Node Agent moi.

---

## SO SANH CAC PHUONG AN KIEN TRUC

| Tieu chi | A. 1 Service lam tat ca (Service goi truc tiep Blender) | B. Service Node Agent + Worker process rieng (session that) | C. Service supervisor + user-session Worker + Blender (nhu B, nhan manh Worker luon o session dang nhap that) | D. Task Scheduler / startup agent (khong dung Service) |
|---|---|---|---|---|
| Rui ro Session 0 chan GPU (muc B) | **Cao** — chua co bang chung GPU compute hoat dong on dinh tu Session 0 tren GPU tieu dung, EXPERIMENT REQUIRED chua lam se la rui ro production truc tiep | Thap hon — Blender luon chay o session that, tranh hoan toan cau hoi Session 0 + GPU | Giong B | Thap nhat — moi thu (ke ca supervisor) chay trong session that tu dau, giong dung kien truc HIEN TAI |
| Tuong thich may diskless/BootROM (muc 0) | Xau — Service dang ky qua SCM (ghi C:\), can BootROM ho tro nung vao golden image | Xau (giong A) o phan Service, nhung Worker (process thuong) khong bi rang buoc nay | Giong B | **Tot nhat** — Scheduled Task "at logon" hoac chinh .bat hien tai deu la co che it phu thuoc trang thai SCM hon, de "nung" vao golden image hon (chi can 1 shortcut/script trong Startup folder cua user, khong can `sc create`) |
| Do phuc tap trien khai | Thap (1 process) nhung rui ro ky thuat cao | Cao (2 process, 1 kenh giao tiep IPC, dong bo trang thai) | Cao tuong tu B, but ro rang hoa vai tro hon | Thap nhat — gan voi kien truc hien tai, it thay doi nhat |
| Kha nang quan ly tap trung (health, remote command, auto-update tach biet) | Trung binh | **Cao nhat** — dung tach lifecycle (Node Agent) khoi cong viec render (Worker), moi ben update doc lap | Cao tuong tu B | Thap hon — khong co "supervisor" tach biet, giong mo hinh hien tai (1 vong lap .bat lam tat) |
| Phu hop long-term "hang tram may" | Kem (rui ro GPU + rui ro diskless cong don) | Tot **NEU** giai quyet duoc van de diskless (muc 0) va Session0-GPU (PoC) | Tot, tuong tu B nhung it mo ho hon ve vai tro | Tot cho quan net diskless, nhung **khong tan dung duoc loi ich quan ly tap trung cua mo hinh Service (health/report/remote-control chuan SCM)** |

**Phan bien truc tiep gia thuyet ban dau ("Windows Service Node Agent +
Render Worker process rieng"):** day khong phai phuong an te, nhung no
**gia dinh ngam moi truong khong diskless**. Neu ap dung nguyen ven cho
quan net diskless ma khong giai quyet muc 0 truoc, kien truc se **khong
hoat dong duoc ngay tu buoc dau tien (cai Service khong ton tai sau
reset)**, bat ke thiet ke ben trong tot the nao.

`[INFERENCE]` khuyen nghi tong hop: **kien truc dung KHONG PHAI 1 trong
4 cot tren duy nhat, ma la hybrid theo tung kich ban trien khai:**
- PC doi tac thuong (khong diskless): **Phuong an B/C** (Service Node
  Agent that su, Worker process rieng trong session dang nhap that) —
  tan dung duoc quan ly SCM chuan.
- May quan net diskless/BootROM: **Phuong an D bien the** — giu nguyen
  tinh than kien truc HIEN TAI (`.bat` supervisor chay trong session
  that, tu update, tu restart) nhung **tach ro logic "giam sat/lifecycle"
  (co the goi la Node Agent, du no la 1 script .bat/Python nho chu
  khong phai Windows Service that) khoi logic "Worker render"** — vay
  van dat duoc muc tieu tach biet vai tro cua phuong an B/C, chi khac o
  cho khong dung Windows Service that (SCM) ma dung "supervisor loop"
  ben vung qua BootROM golden image.

---

## 4 VAN DE CRITICAL — TRANG THAI KIEM CHUNG

1. **Session 0 + Blender/GPU**: `[EXPERIMENT REQUIRED]`. Khong tim duoc
   tai lieu chinh thuc (Microsoft/NVIDIA/Blender) xac nhan thang cho
   truong hop "CUDA/OptiX compute-only tu Windows Service (Session 0)
   tren GPU tieu dung GeForce, WDDM". Bang chung gian tiep (Parsec phai
   xay dung virtual display driver rieng thay vi chi chay service don
   gian) **ho tro gia thuyet co van de that**, nhung khong the khang
   dinh chac chan neu khong PoC truc tiep.

2. **BootROM + duplicate machine identity**: `[EXPERIMENT REQUIRED]` +
   `[UNKNOWN]` (san pham BootROM cu the cua Owner). Chua doc duoc code
   sinh `worker_id` trong pham vi nghien cuu nay (can doc them, ngoai
   pham vi cau hoi ban dau). Rui ro ly thuyet ro rang (may clone giong
   het nhau tu golden image) nhung chua co bang chung da/chua xay ra
   trong thuc te production hien tai.

3. **Chay file .blend khong tin cay / Python script / addon**:
   `[EXPERIMENT REQUIRED]`. Can xac nhan cau hinh "Auto Run Python
   Scripts" cua ban Blender CWS dang dung (mac dinh Blender hien dai la
   TAT, nhung PHAI xac nhan qua chinh cau hinh/phien ban dang dung,
   khong doan), va doc code Worker xem co force tat co nay khong.

4. **Recovery khi Agent/Worker/Blender/network/PC chet**: **Mot phan
   `[VERIFIED]`** — kien truc hien tai (`.bat` supervisor) da co co che
   restart co ban (cooldown 15s, vong lap vo han) va Worker da co
   timeout/retry cho tung buoc (subprocess timeout, retry mang o nhieu
   cho theo code). **Con thieu** (`[INFERENCE]`, chua kiem chung production):
   chua ro co giam sat o cap "toan bo PC bi mat ket noi/mat dien" (Backend
   co phat hien Worker "im lang" qua lau va tu dong requeue job dang
   lam cho Worker do hay khong) — day co ve co (thay bang table
   `worker_state_events`/`worker_incidents` trong Supabase schema da xem
   truoc do trong phien lam viec), nhung **ngoai pham vi truc tiep cua
   nghien cuu Windows Service/Session0 nay** — can xac nhan rieng.

---

## FAILURE MATRIX (tom tat)

| Su co | Phat hien boi | Hanh dong tu dong hien co | Con thieu |
|---|---|---|---|
| Worker process crash | `.bat` supervisor (subprocess thoat) | Restart sau 15s | Gioi han so lan restart lien tiep truoc khi bao "degraded" |
| Blender crash/timeout | Worker code (timeout 3600s, doc stderr) | Bat loi OOM/CUDA qua text-matching | Phan biet ro TDR-crash voi OOM-crash (khac nguyen nhan sua) |
| VRAM OOM | Worker code (text-matching stderr) | Co xu ly (giam chat luong/retry — chi tiet ngoai pham vi bao cao nay) | — |
| Mat mang tam thoi | `.bat` (auto-update check bo qua neu mat mang) | Bo qua buoc update, chay tiep ban hien co | Retry/backoff ro rang hon thay vi "bo qua im lang" |
| Mat dien/tat may dot ngot | `[UNKNOWN]` — chua xac nhan | — | Backend can co timeout heartbeat de requeue job — CAN XAC NHAN RIENG |
| Reset diskless (BootROM) | Khong duoc "phat hien" — la hanh vi binh thuong cua may nay | Golden image + persistent drive (`CWS_DIR`) song sot | worker_id CAN xac nhan co song sot qua reset hay khong (Van de CRITICAL #2) |
| GPU treo (TDR) | `[EXPERIMENT REQUIRED]` — chua ro co log/phat hien rieng | — | Can doc Event Viewer Event ID 4101 tren may production de xac nhan tan suat that |

---

## PoC TOI THIEU DE KIEM CHUNG TRUOC KHI QUYET DINH CUOI CUNG

1. **PoC Session0-GPU** (giai quyet Van de Critical #1): tao 1 Windows
   Service toi gian (khong lam gi khac ngoai goi `blender -b test.blend
   -E CYCLES -o //out -f 1 -- --cycles-device OPTIX` qua subprocess), cai
   dat bang `sc create`, chay tren 1 may that co GPU NVIDIA giong may
   quan net dang dung, kiem tra: (a) file output co duoc tao khong, (b)
   log Blender co bao "OptiX/CUDA device found" hay fallback ve CPU/loi.
   Neu that bai o buoc nay, cau hoi B2 co ket qua ro rang: Service KHONG
   duoc phep goi Blender GPU truc tiep, phai chuyen Worker sang session
   that.

2. **PoC BootROM identity** (giai quyet Van de Critical #2): doc code
   sinh `worker_id` hien tai, xac nhan file luu o dau; neu chua ro, thu
   nghiem: ghi 1 gia tri `worker_id` test vao dung vi tri file dang dung,
   reset may (hoac gia lap reset neu khong the reset that BootROM that
   trong moi truong nghien cuu), kiem tra gia tri co con nguyen hay bi
   xoa/sinh moi.

3. **PoC .blend khong tin cay** (giai quyet Van de Critical #3): kiem tra
   cau hinh "Auto Run Python Scripts" cua dung phien ban Blender dang
   dung trong production (khong doan tu ban Blender khac), thu 1 file
   `.blend` chua 1 script Python co hanh vi de nhan biet (vd ghi file ra
   dia), xac nhan script co tu chay khi Worker mo file qua dung cau lenh
   dang dung hay khong.

4. **PoC recovery toan dien** (giai quyet Van de Critical #4): rut day
   mang/tat dien 1 may dang trong luc render that (moi truong test,
   khong phai production), do thoi gian tu luc mat ket noi den luc
   Backend requeue job sang Worker khac (neu co co che nay), xac nhan
   khong co job "ket dinh" vinh vien vao 1 worker da chet.

---

## DECISION

**Kien truc de xuat ("Windows Service Node Agent + Render Worker process
rieng"): `MODIFY`**

**Confidence: MEDIUM**

Ly do khong phai `REJECT` hoan toan: tach lifecycle (Node Agent) khoi
cong viec render (Worker) la nguyen tac dung, va cho **PC doi tac khong
diskless**, dung Windows Service that cho phan Node Agent la hop ly, co
co so tu tai lieu chinh thuc (SCM recovery, service accounts).

Ly do khong phai `GO` thang: gia thuyet ngam dinh moi truong khong
diskless, trong khi muc tieu dai han chinh la **quan net diskless/BootROM**
— day la khoang trong lon nhat, chua duoc nhac toi trong de xuat ban dau.
Ngoai ra, cau hoi Session0+GPU (Van de Critical #1) van la
`[EXPERIMENT REQUIRED]`, chua co bang chung chinh thuc khang dinh Service
co the goi Blender GPU truc tiep an toan.

**MODIFY cu the:**
1. Tach ro 2 kich ban trien khai (PC thuong vs quan net diskless), khong
   dung chung 1 thiet ke Windows Service cho ca hai.
2. Voi kich ban PC thuong: giu tinh than "Service Node Agent + Worker
   process rieng", nhung Worker BAT BUOC chay trong session dang nhap
   that (khong phai Session 0) cho toi khi PoC #1 xac nhan nguoc lai.
3. Voi kich ban quan net diskless: **khong nen theo duoi Windows Service
   that** (SCM) truoc khi xac nhan BootROM co ho tro luu tru thay doi
   Service qua reset hay khong; uu tien giu/mo rong mo hinh supervisor
   hien co (`.bat` + Python), chi tach ro logic lifecycle/giam sat khoi
   logic render trong CHINH kien truc do, khong bat buoc phai la Windows
   Service that de dat duoc loi ich tach vai tro.
4. Chay ca 4 PoC o muc tren truoc khi cam ket kien truc cuoi cung, dac
   biet PoC #1 (Session0+GPU) va #2 (BootROM identity) vi day la 2 diem
   co the lam sup do toan bo thiet ke neu sai.

---

## Nguon tham khao chinh thuc da dung

- [Interactive Services - Win32 apps | Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/services/interactive-services)
- [NoInteractiveServices: Core Services | Microsoft Learn](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2003/cc786119(v=ws.10))
- [Configure system failure and recovery options - Windows Client | Microsoft Learn](https://learn.microsoft.com/en-us/troubleshoot/windows-client/performance/configure-system-failure-and-recovery-options)
- [Job Objects - Win32 apps | Microsoft Learn](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)
- [WDDM Support for Timeout Detection and Recovery (TDR) - Windows drivers | Microsoft Learn](https://learn.microsoft.com/en-us/windows-hardware/drivers/display/timeout-detection-and-recovery)
- [GPU Rendering - Blender Manual](https://docs.blender.org/manual/en/latest/render/cycles/gpu_rendering.html)
- [Command Line Arguments - Blender Manual](https://docs.blender.org/manual/en/latest/advanced/command_line/arguments.html) (fetch truc tiep bi 403, noi dung xac nhan qua trich dan tim kiem chinh thuc tu docs.blender.org)
- [Application Compatibility - Session 0 Isolation | Microsoft Community Hub](https://techcommunity.microsoft.com/blog/askperf/application-compatibility---session-0-isolation/372361)
- [Hardware and Software Compatibility – Parsec](https://support.parsec.app/hc/en-us/articles/32381568346644-Hardware-and-Software-Compatibility)
- [VDD Advanced Configuration – Parsec](https://support.parsec.app/hc/en-us/articles/32361359271444-VDD-Advanced-Configuration)

Nguon cong dong (chi dung de tham khao failure case, khong dung lam can
cu quyet dinh chinh):
- FireDaemon — Microsoft Windows Interactive Services and Session 0 Isolation
- Puget Systems — Working around TDR in Windows for a better GPU computing experience

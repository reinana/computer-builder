// 設定情報を格納するオブジェクト
const config = {
    appTitle: "Build Your Own PC",
    url: "https://api.recursionist.io/builder/computers?type=",
};

// ハードウェアコンポーネントのクラス（共通属性をもつ基底クラス）
class HardwareComponent {
    constructor(type, brand, model, benchmark) {
        this.type = type;
        this.brand = brand;
        this.model = model;
        this.benchmark = benchmark;
    }
}

// CPU, GPU, RAM, Storage（HardwareComponentを継承）
class CPU extends HardwareComponent {}
class GPU extends HardwareComponent {}
class RAM extends HardwareComponent {}
class Storage extends HardwareComponent {}

// HDD SSDクラス （Storageクラスを継承）
class SSD extends Storage {}
class HDD extends Storage {}


// PCクラス
class PC {
    constructor(cpu, gpu, ram, storage) {
        this.cpu = cpu;
        this.gpu = gpu;
        this.ram = ram;
        this.storage = storage;
    }
    // プライベートメソッドを呼び出してspecを計算する 引数に重みを渡す
    getGamingBenchmark() {
        return this.#calculateBenchmark({
            cpu: 0.25,
            gpu: 0.6,
            ram: 0.125,
            storage: 0.025,
        });
    }

    getWorkBenchmark() {
        return this.#calculateBenchmark({
            cpu: 0.6,
            gpu: 0.25,
            ram: 0.1,
            storage: 0.05,
        });
    }
    // プライベートメソッド https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Classes/Private_properties
    #calculateBenchmark(weights) {
        const cpuScore = this.cpu.benchmark * weights.cpu;
        const gpuScore = this.gpu.benchmark * weights.gpu;
        const ramScore = this.ram.benchmark * weights.ram;
        const storageScore = this.storage.benchmark * weights.storage;
        return (
            Math.floor((cpuScore + gpuScore + ramScore + storageScore) * 100) /
            100
        );
    }
}

class Controller {
    // 部品名文字列[]
    static componentTypes = ["cpu", "gpu", "ram", "storage"];
    // コンポーネントのタイプ文字列からクラスコンストラクタへのマッピング
    static componentClassMap = {
        cpu: CPU,
        gpu: GPU,
        ram: RAM,
        ssd: SSD, 
        hdd: HDD, 
    };
    // フェッチしたデータを保存するオブジェクト
    static fetchedData = {}; 

    static createComponentInstance(componentType) {
        const brand = document.getElementById(`${componentType}-brand`).value;
        const model = document.getElementById(`${componentType}-model`).value;

        // フェッチしたデータから選択されたコンポーネントの情報を検索
        const foundItem = this.fetchedData[componentType].find((item) => item.Brand === brand && item.Model === model);
        const {Type, Brand, Model, Benchmark} = foundItem;

        // マッピングを使用してコンポーネントのインスタンスを生成
        const ComponentClass = this.componentClassMap[Type.toLowerCase()];
        return new ComponentClass(Type, Brand, Model, Benchmark);
    }
    // addボタンを押したイベントリスナーのコールバック pcインスタンスを生成し、viewを表示
    static finalizePCBuild() {
        // ユーザーの選択に基づいてPCインスタンスを作成
        const cpu = this.createComponentInstance("cpu");
        const gpu = this.createComponentInstance("gpu");
        const ram = this.createComponentInstance("ram");
        const storage = this.createComponentInstance("storage");

        // PCインスタンスの作成
        const pc = new PC(cpu, gpu, ram, storage);

        // PCのスペックやベンチマーク結果を表示
        View.displayPCSpecs(pc);
    }
    // コンピュータの構築開始
    static async startComputerBuild() {
        // 初期画面の生成
        View.getInitialPageHTMLString();
        // データのフェッチ、optionへの挿入
        await this.fetchAndDisplayAllData();
    }
    static async fetchAndDisplayAllData() {
        // mapとPromise.allを使用して非同期にデータをフェッチ
        try {
            const fetchPromises = this.componentTypes.map(type => this.fetchAndDisplayComponentData(type));
            await Promise.all(fetchPromises);
        } catch (error) {
            console.error("Error fetching component data: ", error);
            // エラー処理（ユーザーへの通知など）
        }
    }
    
    // コンポーネントデータのフェッチと表示
    static async fetchAndDisplayComponentData(componentType) {

        try {
            // storageはHDD SSDがあるので別処理
            if (componentType === "storage") {
                this.setupStorageTypeSelection();
                return;
            }
            // urlへアクセスしデータのfetch
            const response = await fetch(`${config.url}${componentType}`);
            const data = await response.json();
            this.fetchedData[componentType] = data; // フェッチしたデータを保存

            const brandList = new Set(data.map((item) => item.Brand));
            // ramは How many があるので別処理
            if (componentType === 'ram') {
                this.setupRamNumSelection(data, brandList);
                return;
            }
            // brand
            else {
                // optionへセットする
                View.setOption(componentType, 'brand', brandList);
                // イベントリスナーの付与
                this.setupChangeEventListener(componentType, data);
            }
        } catch (error) {
            console.error(`${componentType} fetch error:`, error);
        }
    }
    // Rumの数をoptionに追加
    static setupRamNumSelection(data, brandList) {
        const numList = new Set(data.map((item) => this.getNumRam(item)));
        View.setOption('ram', 'num', numList);
        View.setOption('ram', 'brand', brandList);

        // イベントリスナー ブランドを変えたとき
        document.getElementById('ram-brand').onchange = (e) => {
            const selectedNum = document.getElementById("ram-num").value;
            const ramFilter = (item) => item.Brand === e.target.value && this.getNumRam(item) === selectedNum;
            const filteredData = data.filter(ramFilter).map((item) => item.Model);
            View.setOption('ram', "model", filteredData);
        };
        // イベントリスナー How manyを変えたとき
        document.getElementById('ram-num').onchange = (e) => {
            const selectedBrand = document.getElementById("ram-brand").value;
            const ramFilter = (item) => item.Brand === selectedBrand && this.getNumRam(item) === e.target.value;
            const filteredData = data.filter(ramFilter).map((item) => item.Model);
            View.setOption('ram', "model", filteredData);
        };
    }
    // storageの処理
    static setupStorageTypeSelection() {
        const storageSelect = document.getElementById("storage-type");
        
        storageSelect.onchange = async (e) => {
            const storageType = e.target.value;
            if (!storageType) return;
            
            try {
                const storageData = await fetch(`${config.url}${storageType}`).then(res => res.json());
                this.fetchedData["storage"] = storageData; // フェッチしたデータを保存

                View.setOption("storage", "capacity", new Set(storageData.map((item) => this.getCapacity(item))));
                View.setOption("storage", "brand", new Set(storageData.map((item) => item.Brand)));
                
                this.initializeStorageSelection(storageData);
            } catch (error) {
                console.error('Storage data fetch error:', error);
            }
        };
    }

    // イベントリスナーの付与 storage brandを変更した時
    static initializeStorageSelection(storageData) {
        const storageBrandSelect = document.getElementById("storage-brand");
        const storageCapacitySelect = document.getElementById("storage-capacity");
        
        const updateModelOptions = () => {
            const filteredData = storageData.filter((item) =>
                item.Brand === storageBrandSelect.value && this.getCapacity(item) === storageCapacitySelect.value
            ).map((item) => item.Model);
            View.setOption("storage", "model", filteredData);
        };
        
        storageBrandSelect.onchange = updateModelOptions;
        storageCapacitySelect.onchange = updateModelOptions;
    }

    // storage の Model の最後の容量を取り出す
    static getCapacity(item) {
        const capacity = item["Model"].match(/\d+(?:GB|TB)/i); // 大文字小文字を区別しない
        return capacity ? capacity[0] : '';
    }

    // modelの中のメモリーカードの数を取り出す
    static getNumRam(item) {
        const match = item["Model"].match(/\d+x/); // 数字に続く 'x' を探す正規表現
        return match ? match[0].slice(0, -1) : ''; // 最後の 'x' を除いて返す
    }

    // イベントリスナー brand
    static setupChangeEventListener(componentType, data) {
        // 各部品のIDを取得
        const selectElementId = `${componentType}-brand`;
        const selectElement = document.getElementById(selectElementId);
        if (!selectElement) return;
        
        selectElement.onchange = () => {
            const selectedOption = selectElement.value;
            // ブランドフィルター
            const brandFilter = (item) => item.Brand === selectedOption;

            const filteredData = data.filter(brandFilter).map((item) => item.Model);
            // brandでfilterしたデータをmodelにセット
            View.setOption(componentType, "model", filteredData);
        };
    }
}

// Viewクラス（UI関連のメソッドを静的に定義）
class View {
    static initialize() {
        this.target = document.getElementById("target");
        this.getInitialPageHTMLString();
    }

    // 初期画面表示
    static getInitialPageHTMLString() {
        // ナビゲーションバーの作成
        const navDiv = this.createDivWithClass("container-fluid");
        navDiv.innerHTML = `
            <nav class="navbar navbar-dark bg-secondary">
                <div class="container-fluid d-flex justify-content-center">
                    <span class="navbar-brand fs-1">${config.appTitle}</span>
                </div>
            </nav>`;

        // メインコンテンツの作成
        const mainDiv = this.createDivWithClass("main container-fluid my-2");
        mainDiv.innerHTML = `
            ${this.createStep("1", "CPU")}
            ${this.createStep("2", "GPU")}
            ${this.createStep("3", "memory card")}
            ${this.createStep("4", "storage")}
            <div class="mt-2">
                <button type="button" id="add-btn" class="btn btn-lg">ADD PC</button>
            </div>`;

        target.append(navDiv, mainDiv);
        // イベントリスナーの追加
        document.getElementById("add-btn").addEventListener("click", () => Controller.finalizePCBuild());
    }

    // ステップのHTMLを生成
    static createStep(stepNumber, componentType ) {
        // idの接頭辞を小文字に、memory cardはramにする
        const idPrefix = componentType === "memory card" ? "ram" : componentType.toLowerCase();        
        
        return `
            <div class="step${stepNumber} container p-2">
                <h3>Step${stepNumber}: Select your ${componentType}</h3>
                <div class="d-flex gap-3">
                    ${idPrefix === "ram" ? this.getNumberRamSelectHTML() : ""}
                    ${idPrefix === "storage" ? this.getStorageSelectHTML() : ""}
                    <div class="input-group my-3">
                        <label for="${idPrefix}-brand" class="col-form-label me-2">Brand</label>
                        <select class="form-select ms-2" id="${idPrefix}-brand"></select>
                    </div>
                    <div class="input-group my-3">
                        <label for="${idPrefix}-model" class="col-form-label me-2">Model</label>
                        <select class="form-select ms-2" id="${idPrefix}-model"></select>
                    </div>
                </div>
            </div>`;
    }
    
    // ramの時はhow manyの選択を追加
    static getNumberRamSelectHTML() {
        return `<div class="input-group my-3">
        <label for="ram-num" class="col-form-label me-2">How Many?</label>
        <select class="form-select ms-2" id="ram-num"></select>
        </div>`; // RAMの選択用HTML
    }
    
    // storageの時はhdd ssdの選択を追加
    static getStorageSelectHTML() {
        return `<div class="input-group my-3">
        <label for="storage-type" class="col-form-label me-2">HDD or SSD</label>
        <select class="form-select ms-2" id="storage-type">
                        <option>-</option>
                        <option value="hdd">HDD</option>
                        <option value="ssd">SSD</option>
                    </select>
            </div>
            <div class="input-group my-3">
                <label for="storage-capacity" class="col-form-label me-2">Storage</label>
                <select class="form-select ms-2" id="storage-capacity"></select>
            </div>`; // ストレージ選択用HTML
    }


    // オプションの追加
    static setOption(componentType, label, dataList) {
        const selectElementId = `${componentType}-${label}`;
        const selectElement = document.getElementById(selectElementId);
        selectElement.innerHTML = '<option>-</option>';
        dataList.forEach((data) => {
            const option = document.createElement("option");
            option.value = data;
            option.textContent = data;
            selectElement.appendChild(option);
        });
    }

    // div要素をクラス名付きで作成
    static createDivWithClass(className) {
        const div = document.createElement("div");
        div.className = className;
        return div;
    }

    // 結果画面表示
    static displayPCSpecs(pc) {
        const resultDiv = this.createDivWithClass("result card mt-5");
        resultDiv.innerHTML = `
            <div class="card-body d-flex justify-content-between">
                <div class="d-flex align-items-center m-5">
                    <p class="card-title">PC Specs</p>
                </div>
                <div>
                    <h3>GPU</h3>
                    <p>${pc.gpu.brand} ${pc.gpu.model}</p>
                    <h3>RAM</h3>
                    <p>${pc.ram.brand} ${pc.ram.model}</p>
                    <h3>STORAGE</h3>
                    <p>${pc.storage.type} ${pc.storage.brand} ${pc.storage.model}</p>
                </div>
                <div class="d-flex align-items-end">
                    <p id="gaming" class="card-text m-0 pe-4">Gaming ${pc.getGamingBenchmark()} %</p>
                    <p id="work" class="card-text">Work ${pc.getWorkBenchmark()} %</p>
                </div>
            </div>`;
        target.append(resultDiv);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    Controller.startComputerBuild();
});

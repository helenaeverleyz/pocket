import { BaseNode } from "./pocket";

export class HelloNode extends BaseNode {
    async prep(sharedState: any): Promise<any> {
        return {};
    }

    public _clone(): BaseNode {
        return new HelloNode();
    }

    async execCore(prepResult: any): Promise<any> {
        console.log("Hello, world!");
    }

    async post(prepResult: any, execResult: any, sharedState: any): Promise<string> {
        return "a";
    }
}

export class WordNode extends BaseNode {
    private word: string;
    constructor(word: string) {
        super();
        this.word = word;
    }

    public _clone(): BaseNode {
        return new WordNode(this.word);
    }

    async execCore(prepResult: any): Promise<any> {
        console.log("WordNode ExecCore: " + this.word);
    }

    async post(prepResult: any, execResult: any, sharedState: any): Promise<string> {
        return this.word;
    }

    async prep(sharedState: any): Promise<any> {
        return {};
    }
}
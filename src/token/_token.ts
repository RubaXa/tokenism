export type TokenObject = object & {
	as: (name: string, comment?: string, value?: any) => TokenObject;
}

export type Token = ((comment: string, value: any) => TokenObject) & {
	as: (name: string, comment?: string, value?: any) => TokenObject;
	optional: Token;
}

export function token(comment: string, value: string): Token {
	return {} as any;
}
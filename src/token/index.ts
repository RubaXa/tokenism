import {
	createDict,
	createToken,
	composeTokens,
} from './token';

// Token Tuples
import agToken from './lib/agToken';
import thread from './lib/thread';
import random from './lib/random';

// Export Tokens
export const tokens = createDict({
	agToken,
	thread,
	random,
});

// Export Methods
export {
	createDict,
	createToken,
	composeTokens,
};
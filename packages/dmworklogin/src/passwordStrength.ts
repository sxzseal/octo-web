import zxcvbn from 'zxcvbn';

export interface PasswordStrengthResult {
    score: number; // 0-4: 0=very weak, 1=weak, 2=fair, 3=strong, 4=very strong
    label: string;
    color: string;
    isValid: boolean;
    feedback: string[];
}

const MIN_PASSWORD_LENGTH = 6;

/**
 * Evaluate password strength using zxcvbn library.
 * Returns a score from 0-4 with localized labels and suggestions.
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
    if (!password) {
        return {
            score: 0,
            label: '',
            color: '#ddd',
            isValid: false,
            feedback: [],
        };
    }

    const feedback: string[] = [];

    // Minimum length check
    if (password.length < MIN_PASSWORD_LENGTH) {
        feedback.push(`密码长度至少需要 ${MIN_PASSWORD_LENGTH} 位`);
    }

    // Use zxcvbn for intelligent strength evaluation
    const result = zxcvbn(password);
    const score = result.score;

    // Add zxcvbn suggestions (translated to Chinese)
    if (result.feedback.warning) {
        const warningMap: Record<string, string> = {
            'Straight rows of keys are easy to guess': '键盘上连续的按键很容易被猜到',
            'Short keyboard patterns are easy to guess': '简短的键盘模式很容易被猜到',
            'Repeats like "aaa" are easy to guess': '像 "aaa" 这样的重复很容易被猜到',
            'Repeats like "abcabcabc" are only slightly harder to guess than "abc"': '重复模式只是略难猜测',
            'Sequences like abc or 6543 are easy to guess': '像 abc 或 6543 这样的序列很容易被猜到',
            'Recent years are easy to guess': '近期年份很容易被猜到',
            'Dates are often easy to guess': '日期通常很容易被猜到',
            'This is a top-10 common password': '这是最常见的10个密码之一',
            'This is a top-100 common password': '这是最常见的100个密码之一',
            'This is a very common password': '这是一个非常常见的密码',
            'This is similar to a commonly used password': '这与常用密码相似',
            'A word by itself is easy to guess': '单个单词很容易被猜到',
            'Names and surnames by themselves are easy to guess': '姓名本身很容易被猜到',
            'Common names and surnames are easy to guess': '常见姓名很容易被猜到',
        };
        const translated = warningMap[result.feedback.warning] || result.feedback.warning;
        feedback.push(translated);
    }

    // Add suggestions
    if (result.feedback.suggestions) {
        const suggestionMap: Record<string, string> = {
            'Use a few words, avoid common phrases': '使用几个单词，避免常见短语',
            'No need for symbols, digits, or uppercase letters': '不一定需要符号、数字或大写字母',
            'Add another word or two. Uncommon words are better.': '添加一两个不常见的单词',
            'Capitalization doesn\'t help very much': '大写字母帮助不大',
            'All-uppercase is almost as easy to guess as all-lowercase': '全大写和全小写一样容易被猜到',
            'Reversed words aren\'t much harder to guess': '倒写的单词并不难猜',
            'Predictable substitutions like \'@\' instead of \'a\' don\'t help very much': '可预测的替换（如用 @ 代替 a）帮助不大',
            'Avoid repeated words and characters': '避免重复的单词和字符',
            'Avoid sequences': '避免使用序列',
            'Avoid recent years': '避免使用近期年份',
            'Avoid years that are associated with you': '避免使用与你相关的年份',
            'Avoid dates and years that are associated with you': '避免使用与你相关的日期和年份',
        };
        result.feedback.suggestions.forEach(suggestion => {
            const translated = suggestionMap[suggestion] || suggestion;
            if (!feedback.includes(translated)) {
                feedback.push(translated);
            }
        });
    }

    // Determine label and color based on score
    const labels = ['非常弱', '弱', '一般', '强', '非常强'];
    const colors = ['#ff4d4f', '#ff7a45', '#faad14', '#52c41a', '#389e0d'];

    // Password is valid if meets minimum length (strength indicator is advisory only)
    const isValid = password.length >= MIN_PASSWORD_LENGTH;

    return {
        score,
        label: labels[score],
        color: colors[score],
        isValid,
        feedback: feedback.slice(0, 2), // Limit to 2 feedback items
    };
}

/**
 * Validate password for submission.
 * Returns error message if invalid, null if valid.
 */
export function validatePassword(password: string): string | null {
    if (!password) {
        return '密码不能为空';
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return `密码长度至少需要 ${MIN_PASSWORD_LENGTH} 位`;
    }

    const result = evaluatePasswordStrength(password);
    if (!result.isValid) {
        return '密码强度太弱，请设置更安全的密码';
    }

    return null;
}

export const detectProductType = (productTitle, category) => {
    // Простая логика: если в категории или типе есть слова про одежду
    const text = ((productTitle || '') + ' ' + (category || '')).toLowerCase();

    // Explicitly exclude items often miscategorized as clothing
    const itemKeywords = ['watch', 'jewelry', 'ring', 'earring', 'necklace', 'phone', 'bag', 'bottle', 'drink'];
    if (itemKeywords.some(keyword => text.includes(keyword))) {
        return 'item';
    }

    const clothingKeywords = ['shirt', 'dress', 'pants', 't-shirt', 'hoodie', 'jacket', 'coat', 'suit', 'blazer', 'cardigan', 'sweater', 'clothing', 'apparel', 'wear', 'bottoms', 'tops', 'skirts'];

    if (clothingKeywords.some(keyword => text.includes(keyword))) {
        return 'clothing';
    }
    return 'item'; // По умолчанию считаем предметом
};

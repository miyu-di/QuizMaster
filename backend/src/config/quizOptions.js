const AGE_GROUPS = ['adults', 'children'];
const DEFAULT_AGE_GROUP = 'adults';

const CATEGORIES = {
  adults: [
    'General knowledge',
    'History',
    'Science',
    'Geography',
    'Movies & TV',
    'Music',
    'Literature',
    'Sports',
    'Technology',
    'Food & Drink',
    'Art'
  ],
  children: [
    'Animals',
    'Fairy tales',
    'Cartoons',
    'Nature',
    'Space',
    'Numbers & Shapes',
    'Colors',
    'Music',
    'Sports',
    'Food'
  ]
};

const ALL_CATEGORIES = [...new Set([...CATEGORIES.adults, ...CATEGORIES.children])];

const BACKGROUNDS = ['bg-1', 'bg-2', 'bg-3', 'bg-4', 'bg-5', 'bg-6'];

module.exports = {
  AGE_GROUPS,
  DEFAULT_AGE_GROUP,
  CATEGORIES,
  ALL_CATEGORIES,
  BACKGROUNDS
};

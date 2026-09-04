export interface LeetCodePremiumQuestion {
  id: string;
  number: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  acceptanceRate: string;
  frequencyScore: number; // 0-100
  companies: string[];
  category: string;
  leetcodeUrl: string;
  videoSolutionUrl: string;
  prompt: string;
  examples: string[];
  constraints: string[];
  keyConcepts: string[];
  starterCode: string;
  solutionCode?: string;
}

export const LEETCODE_PREMIUM_QUESTIONS: LeetCodePremiumQuestion[] = [
  {
    id: 'lc-253',
    number: 253,
    title: 'Meeting Rooms II',
    difficulty: 'Medium',
    acceptanceRate: '50.8%',
    frequencyScore: 99,
    companies: ['Google', 'Meta', 'Amazon', 'Bloomberg', 'Microsoft', 'Uber'],
    category: 'Intervals & Priority Queue',
    leetcodeUrl: 'https://leetcode.com/problems/meeting-rooms-ii/',
    videoSolutionUrl: 'https://www.youtube.com/results?search_query=leetcode+253+meeting+rooms+ii+solution',
    prompt: 'Given an array of meeting time intervals intervals where intervals[i] = [start_i, end_i], return the minimum number of conference rooms required.',
    examples: [
      'Input: intervals = [[0,30],[5,10],[15,20]]\nOutput: 2',
      'Input: intervals = [[7,10],[2,4]]\nOutput: 1'
    ],
    constraints: [
      '1 <= intervals.length <= 10^4',
      '0 <= start_i < end_i <= 10^6'
    ],
    keyConcepts: ['Min-Heap', 'Sorting by Start Time', 'Chronological Event Sweeps'],
    starterCode: `function minMeetingRooms(intervals: number[][]): number {\n  // Write solution...\n};`,
    solutionCode: `function minMeetingRooms(intervals: number[][]): number {
  if (!intervals.length) return 0;
  intervals.sort((a, b) => a[0] - b[0]);
  const heap: number[] = []; // stores end times in min-heap fashion
  
  for (const [start, end] of intervals) {
    if (heap.length && heap[0] <= start) {
      heap.shift(); // room freed
    }
    heap.push(end);
    heap.sort((a, b) => a - b);
  }
  return heap.length;
}`
  },
  {
    id: 'lc-1570',
    number: 1570,
    title: 'Dot Product of Two Sparse Vectors',
    difficulty: 'Medium',
    acceptanceRate: '90.4%',
    frequencyScore: 98,
    companies: ['Meta', 'Google', 'Amazon', 'Apple', 'Bloomberg'],
    category: 'Two Pointers & Hash Map',
    leetcodeUrl: 'https://leetcode.com/problems/dot-product-of-two-sparse-vectors/',
    videoSolutionUrl: 'https://www.youtube.com/results?search_query=leetcode+1570+dot+product+two+sparse+vectors+solution',
    prompt: 'Given two sparse vectors, compute their dot product. Implement class SparseVector with dotProduct(vec) function taking non-zero index mappings for memory efficiency.',
    examples: [
      'Input: nums1 = [1,0,0,2,3], nums2 = [0,3,0,4,0]\nOutput: 8 (1*0 + 0*3 + 0*0 + 2*4 + 3*0)',
      'Input: nums1 = [0,1,0,0,0], nums2 = [0,0,0,0,2]\nOutput: 0'
    ],
    constraints: [
      'n == nums1.length == nums2.length',
      '1 <= n <= 10^5',
      '0 <= nums1[i], nums2[i] <= 100'
    ],
    keyConcepts: ['Index-Value Pairs', 'Two Pointers on Non-Zero Entries', 'Memory Compression'],
    starterCode: `class SparseVector {\n  constructor(nums: number[]) {}\n  dotProduct(vec: SparseVector): number {\n    return 0;\n  }\n}`,
    solutionCode: `class SparseVector {
  pairs: [number, number][];
  constructor(nums: number[]) {
    this.pairs = [];
    nums.forEach((val, idx) => {
      if (val !== 0) this.pairs.push([idx, val]);
    });
  }
  dotProduct(vec: SparseVector): number {
    let result = 0, p1 = 0, p2 = 0;
    while (p1 < this.pairs.length && p2 < vec.pairs.length) {
      if (this.pairs[p1][0] === vec.pairs[p2][0]) {
        result += this.pairs[p1][1] * vec.pairs[p2][1];
        p1++; p2++;
      } else if (this.pairs[p1][0] < vec.pairs[p2][0]) {
        p1++;
      } else {
        p2++;
      }
    }
    return result;
  }
}`
  },
  {
    id: 'lc-314',
    number: 314,
    title: 'Binary Tree Vertical Order Traversal',
    difficulty: 'Medium',
    acceptanceRate: '53.6%',
    frequencyScore: 97,
    companies: ['Meta', 'Amazon', 'Google', 'Bloomberg', 'Microsoft'],
    category: 'Trees & BFS',
    leetcodeUrl: 'https://leetcode.com/problems/binary-tree-vertical-order-traversal/',
    videoSolutionUrl: 'https://www.youtube.com/results?search_query=leetcode+314+binary+tree+vertical+order+traversal',
    prompt: 'Given the root of a binary tree, return the vertical order traversal of its nodes values (from top to bottom, column by column).',
    examples: [
      'Input: root = [3,9,20,null,null,15,7]\nOutput: [[9],[3,15],[20],[7]]',
      'Input: root = [3,9,8,4,0,1,7]\nOutput: [[4],[9],[3,0,1],[8],[7]]'
    ],
    constraints: [
      'The number of nodes in the tree is in the range [0, 100]',
      '-100 <= Node.val <= 100'
    ],
    keyConcepts: ['BFS with Queue', 'Column Coordinates [col - 1, col + 1]', 'Hash Map of Columns'],
    starterCode: `function verticalOrder(root: TreeNode | null): number[][] {\n  // Write solution...\n};`,
    solutionCode: `function verticalOrder(root: any): number[][] {
  if (!root) return [];
  const colMap = new Map<number, number[]>();
  const queue: [any, number][] = [[root, 0]];
  let minCol = 0, maxCol = 0;
  
  while (queue.length) {
    const [node, col] = queue.shift()!;
    if (!colMap.has(col)) colMap.set(col, []);
    colMap.get(col)!.push(node.val);
    minCol = Math.min(minCol, col);
    maxCol = Math.max(maxCol, col);
    
    if (node.left) queue.push([node.left, col - 1]);
    if (node.right) queue.push([node.right, col + 1]);
  }
  
  const result: number[][] = [];
  for (let c = minCol; c <= maxCol; c++) {
    if (colMap.has(c)) result.push(colMap.get(c)!);
  }
  return result;
}`
  },
  {
    id: 'lc-1249',
    number: 1249,
    title: 'Minimum Remove to Make Valid Parentheses',
    difficulty: 'Medium',
    acceptanceRate: '68.5%',
    frequencyScore: 96,
    companies: ['Meta', 'Amazon', 'Bloomberg', 'Apple', 'Google'],
    category: 'Stack & Strings',
    leetcodeUrl: 'https://leetcode.com/problems/minimum-remove-to-make-valid-parentheses/',
    videoSolutionUrl: 'https://www.youtube.com/results?search_query=leetcode+1249+minimum+remove+valid+parentheses',
    prompt: 'Given a string s of ( and ) and lowercase English letters, remove the minimum number of parentheses so that the resulting parentheses string is valid.',
    examples: [
      'Input: s = "lee(t(c)o)de)"\nOutput: "lee(t(c)o)de"',
      'Input: s = "a)b(c)d"\nOutput: "ab(c)d"',
      'Input: s = "))(("\nOutput: ""'
    ],
    constraints: [
      '1 <= s.length <= 10^5',
      's[i] is either ( , ) , or lowercase English letter.'
    ],
    keyConcepts: ['Index Stack', 'Two-Pass Invalidation', 'Set for Invalid Indices'],
    starterCode: `function minRemoveToMakeValid(s: string): string {\n  // Write solution...\n};`,
    solutionCode: `function minRemoveToMakeValid(s: string): string {
  const stack: number[] = [];
  const invalid = new Set<number>();
  
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') {
      stack.push(i);
    } else if (s[i] === ')') {
      if (stack.length) stack.pop();
      else invalid.add(i);
    }
  }
  stack.forEach(idx => invalid.add(idx));
  
  return s.split('').filter((_, i) => !invalid.has(i)).join('');
}`
  },
  {
    id: 'lc-4',
    number: 4,
    title: 'Median of Two Sorted Arrays',
    difficulty: 'Hard',
    acceptanceRate: '39.8%',
    frequencyScore: 95,
    companies: ['Google', 'Amazon', 'Microsoft', 'Apple', 'Goldman Sachs', 'Stripe'],
    category: 'Binary Search & Partitions',
    leetcodeUrl: 'https://leetcode.com/problems/median-of-two-sorted-arrays/',
    videoSolutionUrl: 'https://www.youtube.com/results?search_query=leetcode+4+median+of+two+sorted+arrays+solution',
    prompt: 'Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).',
    examples: [
      'Input: nums1 = [1,3], nums2 = [2]\nOutput: 2.00000',
      'Input: nums1 = [1,2], nums2 = [3,4]\nOutput: 2.50000'
    ],
    constraints: [
      'nums1.length == m, nums2.length == n',
      '0 <= m, n <= 1000',
      '1 <= m + n <= 2000'
    ],
    keyConcepts: ['Binary Search on Smaller Array Partition', 'O(log(min(m, n)))', 'Boundary Checks [Infinity, -Infinity]'],
    starterCode: `function findMedianSortedArrays(nums1: number[], nums2: number[]): number {\n  // Write solution...\n};`,
    solutionCode: `function findMedianSortedArrays(nums1: number[], nums2: number[]): number {
  if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);
  const m = nums1.length, n = nums2.length;
  let low = 0, high = m;
  
  while (low <= high) {
    const p1 = Math.floor((low + high) / 2);
    const p2 = Math.floor((m + n + 1) / 2) - p1;
    
    const maxL1 = p1 === 0 ? -Infinity : nums1[p1 - 1];
    const minR1 = p1 === m ? Infinity : nums1[p1];
    const maxL2 = p2 === 0 ? -Infinity : nums2[p2 - 1];
    const minR2 = p2 === n ? Infinity : nums2[p2];
    
    if (maxL1 <= minR2 && maxL2 <= minR1) {
      if ((m + n) % 2 === 0) {
        return (Math.max(maxL1, maxL2) + Math.min(minR1, minR2)) / 2;
      } else {
        return Math.max(maxL1, maxL2);
      }
    } else if (maxL1 > minR2) {
      high = p1 - 1;
    } else {
      low = p1 + 1;
    }
  }
  return 0;
}`
  },
  {
    id: 'lc-42',
    number: 42,
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    acceptanceRate: '61.5%',
    frequencyScore: 98,
    companies: ['Amazon', 'Google', 'Meta', 'Goldman Sachs', 'Stripe', 'Apple'],
    category: 'Two Pointers & Monotonic Stack',
    leetcodeUrl: 'https://leetcode.com/problems/trapping-rain-water/',
    videoSolutionUrl: 'https://www.youtube.com/results?search_query=leetcode+42+trapping+rain+water+solution',
    prompt: 'Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.',
    examples: [
      'Input: height = [0,1,0,2,1,0,1,3,2,1,2,1]\nOutput: 6',
      'Input: height = [4,2,0,3,2,5]\nOutput: 9'
    ],
    constraints: [
      'n == height.length',
      '1 <= n <= 2 * 10^4',
      '0 <= height[i] <= 10^5'
    ],
    keyConcepts: ['Two Pointers left / right', 'Running leftMax and rightMax', 'O(1) Auxiliary Space'],
    starterCode: `function trap(height: number[]): number {\n  // Write solution...\n};`,
    solutionCode: `function trap(height: number[]): number {
  let left = 0, right = height.length - 1;
  let leftMax = 0, rightMax = 0, total = 0;
  
  while (left < right) {
    if (height[left] < height[right]) {
      if (height[left] >= leftMax) leftMax = height[left];
      else total += leftMax - height[left];
      left++;
    } else {
      if (height[right] >= rightMax) rightMax = height[right];
      else total += rightMax - height[right];
      right--;
    }
  }
  return total;
}`
  },
  {
    id: 'lc-269',
    number: 269,
    title: 'Alien Dictionary',
    difficulty: 'Hard',
    acceptanceRate: '35.4%',
    frequencyScore: 94,
    companies: ['Meta', 'Amazon', 'Google', 'Airbnb', 'Uber'],
    category: 'Graphs & Topological Sort',
    leetcodeUrl: 'https://leetcode.com/problems/alien-dictionary/',
    videoSolutionUrl: 'https://www.youtube.com/results?search_query=leetcode+269+alien+dictionary+solution',
    prompt: 'There is a new alien language that uses English alphabet. Given a list of words from the alien dictionary sorted lexicographically by alien rules, return a string of unique letters sorted in alien order.',
    examples: [
      'Input: words = ["wrt","wrf","er","ett","rftt"]\nOutput: "wertf"',
      'Input: words = ["z","x"]\nOutput: "zx"',
      'Input: words = ["z","x","z"]\nOutput: "" (Invalid cycle)'
    ],
    constraints: [
      '1 <= words.length <= 100',
      '1 <= words[i].length <= 100',
      'words[i] consists of only lowercase English letters.'
    ],
    keyConcepts: ['Directed Acyclic Graph (DAG)', 'Indegree Map (Kahns Algorithm)', 'Cycle Detection'],
    starterCode: `function alienOrder(words: string[]): string {\n  // Write solution...\n};`,
    solutionCode: `function alienOrder(words: string[]): string {
  const adj = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  
  words.forEach(w => w.split('').forEach(c => {
    if (!adj.has(c)) adj.set(c, new Set());
    if (!inDegree.has(c)) inDegree.set(c, 0);
  }));
  
  for (let i = 0; i < words.length - 1; i++) {
    const w1 = words[i], w2 = words[i + 1];
    if (w1.length > w2.length && w1.startsWith(w2)) return '';
    for (let j = 0; j < Math.min(w1.length, w2.length); j++) {
      if (w1[j] !== w2[j]) {
        if (!adj.get(w1[j])!.has(w2[j])) {
          adj.get(w1[j])!.add(w2[j]);
          inDegree.set(w2[j], inDegree.get(w2[j])! + 1);
        }
        break;
      }
    }
  }
  
  const queue: string[] = [];
  inDegree.forEach((deg, ch) => { if (deg === 0) queue.push(ch); });
  
  let result = '';
  while (queue.length) {
    const curr = queue.shift()!;
    result += curr;
    adj.get(curr)!.forEach(neighbor => {
      inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
      if (inDegree.get(neighbor) === 0) queue.push(neighbor);
    });
  }
  
  return result.length === inDegree.size ? result : '';
}`
  },
  {
    id: 'lc-146',
    number: 146,
    title: 'LRU Cache',
    difficulty: 'Medium',
    acceptanceRate: '42.1%',
    frequencyScore: 99,
    companies: ['Amazon', 'Google', 'Meta', 'Microsoft', 'Bloomberg', 'Apple', 'Stripe'],
    category: 'Design & Doubly Linked List',
    leetcodeUrl: 'https://leetcode.com/problems/lru-cache/',
    videoSolutionUrl: 'https://www.youtube.com/results?search_query=leetcode+146+lru+cache+solution',
    prompt: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement LRUCache class with get(key) and put(key, value) in O(1) time complexity.',
    examples: [
      'Input: ["LRUCache", "put", "put", "get", "put", "get", "put", "get", "get", "get"]\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]\nOutput: [null, null, null, 1, null, -1, null, -1, 3, 4]'
    ],
    constraints: [
      '1 <= capacity <= 3000',
      '0 <= key <= 10^4',
      '0 <= value <= 10^5',
      'At most 2 * 10^5 calls to get and put.'
    ],
    keyConcepts: ['Hash Map + Doubly Linked List', 'O(1) Eviction', 'Sentinel Head & Tail Nodes'],
    starterCode: `class LRUCache {\n  constructor(capacity: number) {}\n  get(key: number): number { return -1; }\n  put(key: number, value: number): void {}\n}`,
    solutionCode: `class LRUCache {
  capacity: number;
  map: Map<number, number>;
  constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key: number): number {
    if (!this.map.has(key)) return -1;
    const val = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, val);
    return val;
  }
  put(key: number, value: number): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldestKey = this.map.keys().next().value;
      this.map.delete(oldestKey);
    }
  }
}`
  }
];

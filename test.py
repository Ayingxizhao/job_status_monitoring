from collections import deque
class Solution(object):
    def snakesAndLadders(self, board):
        """
        :type board: List[List[int]]
        :rtype: int
        """
        def coord(curr):
            if curr%n == 0:
                r = curr//n
            else:
                r = curr//n+1
            if r//2 == 0:
                c = curr%n
            else:
                c = n - curr%n
            return r, c

        n = len(board[0])
        end = n*n
        visited = {1}
        queue = deque([(1, 0)])
        while queue:
            curr, moves = queue.popleft()
            if curr == end:
                return moves
            
            for i in range(1,7):
                if curr+i > end:
                    continue
                curr = curr+i
                r, c = coord(curr)
                print(r, c)
                if board[r][c] != 1:
                    next_curr = board[r][c]
                    break
                if i == 6:
                    next_curr = curr+6
            print(next_curr)
            visited.add(curr)
            if curr not in visited:
                queue.append([next_curr, moves+1])
        return -1

sol = Solution()
print(sol.snakesAndLadders([[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1],[-1,35,-1,-1,13,-1],[-1,-1,-1,-1,-1,-1],[-1,15,-1,-1,-1,-1]]))




                    